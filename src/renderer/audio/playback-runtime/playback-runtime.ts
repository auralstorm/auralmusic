import {
  createEqualizerGraph,
  type EqualizerGraph,
} from '../equalizer/equalizer-graph.ts'
import {
  DEFAULT_EQUALIZER_CONFIG,
  normalizeEqualizerConfig,
  type EqualizerConfig,
} from '../../../shared/equalizer.ts'
import { applyAudioOutputDevice } from '../../lib/audio-output.ts'
import {
  classifyPlaybackRuntimeError,
  normalizePlaybackOutputDeviceId,
  shouldReuseLoadedSource,
} from './playback-runtime.model.ts'

export interface PlaybackRuntime {
  getAudioElement: () => HTMLAudioElement
  loadSource: (url: string) => Promise<void>
  play: () => Promise<void>
  pause: () => void
  stop: () => void
  seek: (timeSeconds: number) => void
  setVolume: (volume: number) => void
  setPlaybackRate: (rate: number) => void
  setOutputDevice: (deviceId: string) => Promise<boolean>
  applyEqualizer: (config: EqualizerConfig) => void
}

export function createPlaybackRuntime(options?: {
  createAudioElement?: () => HTMLAudioElement
  createEqualizerGraph?: (options: {
    audioElement: HTMLAudioElement
  }) => EqualizerGraph
}): PlaybackRuntime {
  let loadedSource = ''
  let audioElement: HTMLAudioElement | null = null
  let equalizerGraph: EqualizerGraph | null = null
  let equalizerConfig = DEFAULT_EQUALIZER_CONFIG

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
      audio.pause()
      audio.removeAttribute('src')
      audio.currentTime = 0
      audio.load()
      audio.src = url
      loadedSource = url
    },
    async play() {
      const audio = getAudio()
      if (equalizerConfig.enabled) {
        await ensureEqualizerGraph().resume()
      }
      await audio.play()
    },
    pause() {
      const audio = getAudio()
      audio.pause()
    },
    stop() {
      const audio = getAudio()
      audio.pause()
      audio.removeAttribute('src')
      audio.currentTime = 0
      audio.load()
      loadedSource = ''
    },
    seek(timeSeconds) {
      const audio = getAudio()
      audio.currentTime = Math.max(0, timeSeconds)
    },
    setVolume(volume) {
      const audio = getAudio()
      audio.volume = volume
    },
    setPlaybackRate(rate) {
      const audio = getAudio()
      audio.playbackRate = rate
    },
    async setOutputDevice(deviceId) {
      const audio = getAudio()
      const normalizedDeviceId = normalizePlaybackOutputDeviceId(deviceId)

      if (equalizerConfig.enabled) {
        const applied =
          await ensureEqualizerGraph().setOutputDevice(normalizedDeviceId)

        if (applied) {
          return true
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
      if (!equalizerConfig.enabled && !equalizerGraph) {
        return
      }

      ensureEqualizerGraph().update(equalizerConfig)
    },
  }
}

export const playbackRuntime = createPlaybackRuntime()
