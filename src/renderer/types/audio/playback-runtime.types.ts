import type { EqualizerConfig } from '../../../shared/equalizer.ts'
import type { EqualizerGraph } from './equalizer.types'

export type PlaybackRuntimeFailureKind =
  | 'output_device_failed'
  | 'source_load_failed'
  | 'audio_context_failed'
  | 'graph_failed'
  | 'play_failed'

export interface CreatePlaybackRuntimeOptions {
  createAudioElement?: () => HTMLAudioElement
  createEqualizerGraph?: (options: {
    audioElement: HTMLAudioElement
  }) => EqualizerGraph
}

export interface PlaybackRuntime {
  getAudioElement: () => HTMLAudioElement
  loadSource: (url: string) => Promise<void>
  play: () => Promise<void>
  playWithFade: () => Promise<void>
  pause: () => void
  pauseWithFade: () => Promise<void>
  hasPendingPauseIntent: () => boolean
  stop: () => void
  swapSourceWithFade: (url: string) => Promise<void>
  seek: (timeSeconds: number) => void
  setVolume: (volume: number) => void
  setFadeEnabled: (enabled: boolean) => void
  setPlaybackRate: (rate: number) => void
  setOutputDevice: (deviceId: string) => Promise<boolean>
  applyEqualizer: (config: EqualizerConfig) => void
  requiresEqualizerCompatibleSource: () => boolean
}
