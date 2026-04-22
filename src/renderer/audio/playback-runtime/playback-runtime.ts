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
  let loadedSource = ''
  let audioElement: HTMLAudioElement | null = null
  let equalizerGraph: EqualizerGraph | null = null
  let equalizerConfig = DEFAULT_EQUALIZER_CONFIG
  let fadeEnabled = false
  let transportIntentId = 0
  let pendingPauseIntentId: number | null = null

  const waitForFade = (durationMs: number) => {
    return new Promise<void>(resolve => {
      globalThis.setTimeout(resolve, durationMs)
    })
  }

  const beginTransportIntent = () => {
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
      audioElement = options.createAudioElement()
      return audioElement
    }

    if (typeof Audio === 'undefined') {
      throw new Error('Audio is not available')
    }

    audioElement = new Audio()
    return audioElement
  }

  const ensureEqualizerGraph = () => {
    if (equalizerGraph) {
      return equalizerGraph
    }

    const audioElement = getAudio()
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
      audio.crossOrigin = isEqualizerGraphCompatibleSourceUrl(url)
        ? 'anonymous'
        : null
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
      graph.fadeTo(1, DEFAULT_PLAYBACK_FADE_DURATION_MS)
    },
    pause() {
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
      audio.pause()
    },
    hasPendingPauseIntent,
    stop() {
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
        graph.fadeTo(0, DEFAULT_PLAYBACK_FADE_DURATION_MS)
        await waitForFade(DEFAULT_PLAYBACK_FADE_DURATION_MS)
      }

      await this.loadSource(url)

      if (wasPlaying) {
        await this.playWithFade()
      } else {
        graph.setMasterVolume(1)
      }
    },
    seek(timeSeconds) {
      const audio = getAudio()
      audio.currentTime = Math.max(0, timeSeconds)
    },
    setVolume(volume) {
      const audio = getAudio()
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
        await applyAudioOutputDevice(audio, normalizedDeviceId)
        return true
      } catch {
        return false
      }
    },
    applyEqualizer(config) {
      equalizerConfig = normalizeEqualizerConfig(config)
      if (!shouldUseEqualizerGraph() && !equalizerGraph) {
        return
      }

      if (shouldUseEqualizerGraph()) {
        ensureEqualizerGraph().update(equalizerConfig)
      } else {
        equalizerGraph?.update({
          ...equalizerConfig,
          enabled: false,
        })
      }
      resumeEqualizerGraphForActivePlayback(equalizerGraph)
    },
    requiresEqualizerCompatibleSource() {
      return equalizerConfig.enabled || fadeEnabled || Boolean(equalizerGraph)
    },
  }
}

export const playbackRuntime = createPlaybackRuntime()
