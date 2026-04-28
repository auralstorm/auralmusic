import { createEqualizerGraph } from '../equalizer/equalizer-graph.ts'
import {
  DEFAULT_EQUALIZER_CONFIG,
  normalizeEqualizerConfig,
} from '../../../shared/equalizer.ts'
import {
  DEFAULT_PLAYBACK_FADE_DURATION_MS,
  shouldFadePlaybackPause,
  shouldFadePlaybackStart,
  shouldFadeTrackTransition,
} from './playback-fade.model.ts'
import { applyAudioOutputDevice } from '../../lib/audio-output.ts'
import {
  classifyPlaybackRuntimeError,
  isEqualizerGraphCompatibleSourceUrl,
  normalizePlaybackOutputDeviceId,
  shouldReuseLoadedSource,
} from './playback-runtime.model.ts'
import type {
  CreatePlaybackRuntimeOptions,
  EqualizerGraph,
  PlaybackRuntime,
} from '@/types/audio'

export function createPlaybackRuntime(
  options?: CreatePlaybackRuntimeOptions
): PlaybackRuntime {
  // 当前已加载音源 URL，用于避免同一地址重复 load 打断缓冲。
  let loadedSource = ''
  // runtime 全局复用一个 audio element，播放器事件和外部控制都绑定到它。
  let audioElement: HTMLAudioElement | null = null
  // WebAudio 图谱按需创建；只有均衡器/淡入淡出需要时才接入。
  let equalizerGraph: EqualizerGraph | null = null
  // 当前均衡器配置，graph 尚未创建时也要先记住用户设置。
  let equalizerConfig = DEFAULT_EQUALIZER_CONFIG
  // 是否启用播放淡入淡出，配置关闭时保留直接播放/暂停路径。
  let fadeEnabled = false
  // 播放控制意图序号，用于淘汰晚到的异步 play/pause/fade。
  let transportIntentId = 0
  // 正在等待淡出后暂停的意图，用于外部判断“即将暂停但还没 pause”。
  let pendingPauseIntentId: number | null = null

  const waitForFade = (durationMs: number) => {
    return new Promise<void>(resolve => {
      globalThis.setTimeout(resolve, durationMs)
    })
  }

  const beginTransportIntent = () => {
    // 每次播放/暂停/停止都开启新意图，旧异步步骤看到序号变化后自然退出。
    transportIntentId += 1
    pendingPauseIntentId = null
    return transportIntentId
  }

  const isTransportIntentStale = (intentId: number) => {
    return intentId !== transportIntentId
  }

  const hasPendingPauseIntent = () => {
    return (
      pendingPauseIntentId !== null &&
      !isTransportIntentStale(pendingPauseIntentId)
    )
  }

  const getAudio = () => {
    if (audioElement) {
      return audioElement
    }

    if (options?.createAudioElement) {
      // 测试环境可注入 audio element，避免依赖真实浏览器 Audio 构造器。
      audioElement = options.createAudioElement()
      return audioElement
    }

    if (typeof Audio === 'undefined') {
      throw new Error('Audio is not available')
    }

    // 浏览器运行时懒创建 audio element，避免模块加载阶段触发 DOM/媒体能力访问。
    audioElement = new Audio()
    return audioElement
  }

  const ensureEqualizerGraph = () => {
    if (equalizerGraph) {
      return equalizerGraph
    }

    const audioElement = getAudio()
    // graph 创建后会把 audio element 接入 MediaElementSource，后续复用同一 graph。
    equalizerGraph =
      options?.createEqualizerGraph?.({
        audioElement,
      }) ?? createEqualizerGraph({ audioElement })
    equalizerGraph.update(equalizerConfig)
    return equalizerGraph
  }

  const canUseEqualizerGraphForLoadedSource = () => {
    return isEqualizerGraphCompatibleSourceUrl(loadedSource)
  }

  const shouldUseAudioGraph = () => {
    // 淡入淡出和均衡器都依赖 masterGain/filter 链路，但远端不可控源不能接入 graph。
    return (
      (equalizerConfig.enabled || fadeEnabled) &&
      canUseEqualizerGraphForLoadedSource()
    )
  }

  const shouldUseEqualizerGraph = () => {
    return equalizerConfig.enabled && canUseEqualizerGraphForLoadedSource()
  }

  const canUseFadeGraph = () => {
    return fadeEnabled && shouldUseAudioGraph()
  }

  const resumeEqualizerGraphForActivePlayback = (
    graph: EqualizerGraph | null
  ) => {
    if (!graph) {
      return
    }

    const audio = getAudio()
    if (audio.paused) {
      return
    }

    // 播放中修改均衡器配置时需要恢复 AudioContext，否则 graph 可能保持 suspended。
    void graph.resume().catch(error => {
      console.error('resume equalizer graph failed', error)
    })
  }

  return {
    getAudioElement: () => getAudio(),
    async loadSource(url) {
      if (!url || !url.trim()) {
        throw new Error(classifyPlaybackRuntimeError(undefined, 'source-load'))
      }

      if (shouldReuseLoadedSource(loadedSource, url)) {
        return
      }

      const audio = getAudio()
      // 只有可接入 WebAudio 的源才设置 anonymous，避免普通远端源因 CORS 失败影响原生播放。
      audio.crossOrigin = isEqualizerGraphCompatibleSourceUrl(url)
        ? 'anonymous'
        : null
      // 先清空旧 src 并 load，确保浏览器释放上一首的解码/网络状态。
      audio.pause()
      audio.removeAttribute('src')
      audio.currentTime = 0
      audio.load()
      audio.src = url
      loadedSource = url
    },
    async play() {
      const intentId = beginTransportIntent()
      const audio = getAudio()
      const graph = shouldUseAudioGraph()
        ? ensureEqualizerGraph()
        : equalizerGraph

      if (graph) {
        // 直接播放路径仍需把 masterGain 恢复到 1，避免上一次淡出后保持静音。
        graph.setMasterVolume(1)
        await graph.resume()
        if (isTransportIntentStale(intentId)) {
          return
        }
      }

      if (isTransportIntentStale(intentId)) {
        return
      }
      await audio.play()
    },
    async playWithFade() {
      const intentId = beginTransportIntent()
      const audio = getAudio()

      if (
        !shouldFadePlaybackStart({
          enabled: canUseFadeGraph(),
          hasSource: Boolean(audio.src),
        })
      ) {
        const graph = shouldUseAudioGraph()
          ? ensureEqualizerGraph()
          : equalizerGraph

        if (graph) {
          // fade 不可用时仍恢复 graph 音量，避免此前 fadeTo(0) 留下静音状态。
          graph.setMasterVolume(1)
          await graph.resume()
          if (isTransportIntentStale(intentId)) {
            return
          }
        }

        if (isTransportIntentStale(intentId)) {
          return
        }
        await audio.play()
        return
      }

      const graph = ensureEqualizerGraph()
      await graph.resume()
      if (isTransportIntentStale(intentId)) {
        return
      }
      graph.setMasterVolume(0)
      if (isTransportIntentStale(intentId)) {
        return
      }
      await audio.play()
      if (isTransportIntentStale(intentId)) {
        return
      }
      // play 成功后再开始淡入，避免浏览器阻止播放时仍然推进音量曲线。
      graph.fadeTo(1, DEFAULT_PLAYBACK_FADE_DURATION_MS)
    },
    pause() {
      // 立即暂停用于用户强制暂停或 fade 不可用场景。
      beginTransportIntent()
      const audio = getAudio()
      audio.pause()
    },
    async pauseWithFade() {
      const intentId = beginTransportIntent()
      const audio = getAudio()

      if (
        !shouldFadePlaybackPause({
          enabled: canUseFadeGraph(),
          hasSource: Boolean(audio.src),
        })
      ) {
        this.pause()
        return
      }

      const graph = ensureEqualizerGraph()
      pendingPauseIntentId = intentId
      graph.fadeTo(0, DEFAULT_PLAYBACK_FADE_DURATION_MS)
      await waitForFade(DEFAULT_PLAYBACK_FADE_DURATION_MS)
      if (isTransportIntentStale(intentId)) {
        return
      }
      pendingPauseIntentId = null
      // 只有当前意图仍有效时才真正 pause，避免淡出期间用户又点了播放。
      audio.pause()
    },
    hasPendingPauseIntent,
    stop() {
      // stop 比 pause 更彻底，会释放当前 src 并清空 loadedSource。
      beginTransportIntent()
      const audio = getAudio()
      audio.pause()
      audio.removeAttribute('src')
      audio.currentTime = 0
      audio.load()
      loadedSource = ''
    },
    async swapSourceWithFade(url) {
      const audio = getAudio()

      if (
        !shouldFadeTrackTransition({
          enabled: canUseFadeGraph(),
          hasActiveSource: Boolean(loadedSource),
        })
      ) {
        await this.loadSource(url)
        return
      }

      const wasPlaying = !audio.paused
      const graph = ensureEqualizerGraph()

      if (wasPlaying) {
        // 正在播放时先淡出旧歌，再换源，减少切歌爆音。
        graph.fadeTo(0, DEFAULT_PLAYBACK_FADE_DURATION_MS)
        await waitForFade(DEFAULT_PLAYBACK_FADE_DURATION_MS)
      }

      await this.loadSource(url)

      if (wasPlaying) {
        // 只有旧歌原本在播放时才自动淡入新歌；暂停态换源保持不出声。
        await this.playWithFade()
      } else {
        graph.setMasterVolume(1)
      }
    },
    seek(timeSeconds) {
      const audio = getAudio()
      // seek 只接受非负秒数，非法值交给调用方在 store 层归一化。
      audio.currentTime = Math.max(0, timeSeconds)
    },
    setVolume(volume) {
      const audio = getAudio()
      // 用户音量直接写 audio.volume，淡入淡出独立走 graph masterGain。
      audio.volume = volume
    },
    setFadeEnabled(enabled) {
      fadeEnabled = enabled
    },
    setPlaybackRate(rate) {
      const audio = getAudio()
      audio.playbackRate = rate
    },
    async setOutputDevice(deviceId) {
      const audio = getAudio()
      const normalizedDeviceId = normalizePlaybackOutputDeviceId(deviceId)

      if (shouldUseAudioGraph() || equalizerGraph) {
        try {
          // graph 已存在时优先切 AudioContext 输出，保证均衡器链路和最终输出设备一致。
          const graph = shouldUseAudioGraph()
            ? ensureEqualizerGraph()
            : equalizerGraph
          const applied = await graph?.setOutputDevice(normalizedDeviceId)

          if (applied) {
            return true
          }
        } catch {
          // Fall through to the audio element output path.
        }
      }

      try {
        // AudioContext 不支持 setSinkId 或切换失败时，降级到 HTMLAudioElement.setSinkId。
        await applyAudioOutputDevice(audio, normalizedDeviceId)
        return true
      } catch {
        return false
      }
    },
    applyEqualizer(config) {
      equalizerConfig = normalizeEqualizerConfig(config)
      if (!shouldUseEqualizerGraph() && !equalizerGraph) {
        // graph 尚未创建且均衡器关闭时，只保存配置，不提前占用 AudioContext。
        return
      }

      if (shouldUseEqualizerGraph()) {
        ensureEqualizerGraph().update(equalizerConfig)
      } else {
        // 已创建的 graph 不能移除 MediaElementSource，只能把均衡器恢复为中性状态。
        equalizerGraph?.update({
          ...equalizerConfig,
          enabled: false,
        })
      }
      resumeEqualizerGraphForActivePlayback(equalizerGraph)
    },
    requiresEqualizerCompatibleSource() {
      // 下载/缓存层用这个信号决定是否需要把远端音频转换为可接入 graph 的本地源。
      return equalizerConfig.enabled || fadeEnabled || Boolean(equalizerGraph)
    },
  }
}

// 全局播放器 runtime 单例，确保全应用只存在一个 HTMLAudioElement 和音频 graph。
export const playbackRuntime = createPlaybackRuntime()
