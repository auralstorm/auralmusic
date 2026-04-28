import {
  DEFAULT_EQUALIZER_CONFIG,
  EQ_BANDS,
  normalizeEqualizerConfig,
} from '../../../shared/equalizer.ts'
import { DEFAULT_AUDIO_OUTPUT_DEVICE_ID } from '../../lib/audio-output.ts'
import type {
  ConnectableAudioNode,
  EqualizerAudioContext,
  EqualizerGraph,
} from '@/types/audio'

/**
 * 将分贝增益转换为 WebAudio GainNode 需要的线性倍率
 * @param db 分贝值，例如 +6dB / -3dB
 */
export function equalizerDbToLinearGain(db: number) {
  return Math.pow(10, db / 20)
}

// AudioContext.setSinkId 使用空字符串表示默认设备，这里和全局音频输出配置保持一致。
function normalizeAudioContextSinkId(deviceId: string) {
  return deviceId || DEFAULT_AUDIO_OUTPUT_DEVICE_ID
}

/**
 * 按顺序串联 WebAudio 节点
 *
 * 节点链为 source -> masterGain -> preamp -> EQ filters -> destination。
 */
function connectNodes(nodes: unknown[]) {
  for (let index = 0; index < nodes.length - 1; index += 1) {
    ;(nodes[index] as ConnectableAudioNode).connect(nodes[index + 1])
  }
}

/**
 * 在当前时间点锁住 AudioParam
 *
 * 新的 fade 开始前必须先取消旧的自动化曲线，否则连续播放/暂停会让音量曲线叠加。
 */
function holdAudioParamAtCurrentValue(param: AudioParam, time: number) {
  if (typeof param.cancelAndHoldAtTime === 'function') {
    param.cancelAndHoldAtTime(time)
    return
  }

  param.cancelScheduledValues(time)
  param.setValueAtTime(param.value, time)
}

/**
 * 创建浏览器兼容的 AudioContext
 *
 * Electron 内部 Chromium 仍可能暴露 webkitAudioContext，保留兜底可以提升兼容性。
 */
function createDefaultAudioContext(): EqualizerAudioContext {
  const AudioContextConstructor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext

  if (!AudioContextConstructor) {
    throw new Error('AudioContext is not supported')
  }

  return new AudioContextConstructor()
}

/**
 * 创建播放器 WebAudio 图谱
 * @param options.audioElement 被播放器 runtime 管理的 HTMLAudioElement
 * @param options.createAudioContext 测试或特殊环境注入的 AudioContext 工厂
 * @returns 可更新均衡器、控制主音量淡入淡出、切换输出设备的 graph
 */
export function createEqualizerGraph(options: {
  audioElement: HTMLMediaElement
  createAudioContext?: () => EqualizerAudioContext
}): EqualizerGraph {
  const audioContext =
    options.createAudioContext?.() ?? createDefaultAudioContext()
  const source = audioContext.createMediaElementSource(options.audioElement)
  // masterGain 只负责播放器级淡入淡出，不承载用户音量百分比。
  const masterGain = audioContext.createGain()
  // preamp 负责均衡器整体前级增益，避免单个频段提升后整体响度不可控。
  const preamp = audioContext.createGain()
  const filters = EQ_BANDS.map(band => {
    const filter = audioContext.createBiquadFilter()
    filter.type = 'peaking'
    filter.frequency.value = band.frequency
    filter.Q.value = 1
    filter.gain.value = 0
    return filter
  })

  connectNodes([
    source,
    masterGain,
    preamp,
    ...filters,
    audioContext.destination,
  ])

  const graph: EqualizerGraph = {
    update(config) {
      const normalizedConfig = normalizeEqualizerConfig(config)

      if (!normalizedConfig.enabled) {
        // 关闭均衡器时保留 graph 链路，但把 preamp 和频段恢复中性，淡入淡出仍可继续复用 masterGain。
        preamp.gain.value = 1
        filters.forEach(filter => {
          filter.gain.value = 0
        })
        return
      }

      // preamp 使用线性倍率，频段 filter.gain 使用 dB，二者单位不同不能混用。
      preamp.gain.value = equalizerDbToLinearGain(normalizedConfig.preamp)
      normalizedConfig.bands.forEach((band, index) => {
        const filter = filters[index]
        if (filter) {
          filter.gain.value = band.gain
        }
      })
    },
    async resume() {
      if (audioContext.state === 'suspended') {
        // 浏览器自动播放策略会挂起 AudioContext，真正播放前需要显式恢复。
        await audioContext.resume()
      }
    },
    setMasterVolume(volume) {
      masterGain.gain.value = volume
    },
    getMasterVolume() {
      return masterGain.gain.value
    },
    fadeTo(volume, durationMs) {
      const now = audioContext.currentTime
      // 连续淡入/淡出时先从当前实际值接续，避免音量跳变。
      holdAudioParamAtCurrentValue(masterGain.gain, now)
      masterGain.gain.linearRampToValueAtTime(volume, now + durationMs / 1000)
    },
    async setOutputDevice(deviceId) {
      if (!audioContext.setSinkId) {
        // setSinkId 不是所有 Chromium 版本都支持；runtime 会降级到 audio element 路径。
        return false
      }

      await audioContext.setSinkId(normalizeAudioContextSinkId(deviceId))
      return true
    },
    dispose() {
      // 显式断开节点并关闭 AudioContext，避免热重载或销毁播放器后继续占用音频资源。
      ;[source, masterGain, preamp, ...filters].forEach(node => {
        node.disconnect()
      })
      void audioContext.close()
    },
  }

  // 创建后先应用默认配置，保证 graph 即使未启用均衡器也处于中性状态。
  graph.update(DEFAULT_EQUALIZER_CONFIG)

  return graph
}
