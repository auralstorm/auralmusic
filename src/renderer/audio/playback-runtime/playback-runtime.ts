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
}

export function createPlaybackRuntime(options?: {
  createAudioElement?: () => HTMLAudioElement
}): PlaybackRuntime {
  let loadedSource = ''
  let audioElement: HTMLAudioElement | null = null

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
      try {
        await applyAudioOutputDevice(
          audio,
          normalizePlaybackOutputDeviceId(deviceId)
        )
        return true
      } catch {
        return false
      }
    },
  }
}

export const playbackRuntime = createPlaybackRuntime()
