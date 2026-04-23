import type { MutableRefObject } from 'react'
import type { AppConfig, AudioQualityLevel } from '../../../../shared/config.ts'
import type { EqualizerConfig } from '../../../../shared/equalizer.ts'
import type { PlaybackResolverConfig } from '@/types/core'
import type { PlaybackStoreState } from '@/types/core'

export interface PlaybackEngineRef {
  getAudioElement: () => HTMLAudioElement | null
}

export interface CurrentPlaybackSource {
  trackId: number
  sourceUrl: string
  loadedUrl: string
  cacheKey: string | null
}

export interface PlaybackEngineRuntimeRefs {
  volumeRef: MutableRefObject<number>
  configRef: MutableRefObject<PlaybackResolverConfig>
  qualityRef: MutableRefObject<AudioQualityLevel>
  equalizerRef: MutableRefObject<EqualizerConfig>
  currentPlaybackSourceRef: MutableRefObject<CurrentPlaybackSource | null>
  playbackSpeedRef: MutableRefObject<number>
  audioOutputDeviceIdRef: MutableRefObject<AppConfig['audioOutputDeviceId']>
}

export interface PendingTrackAudio {
  currentTime: number
  pause: () => void
  removeAttribute: (name: string) => void
  load: () => void
}

export interface ProgressRestorableAudio {
  readyState: number
  currentTime: number
  addEventListener: (
    eventName: 'loadedmetadata' | 'error',
    listener: () => void,
    options?: AddEventListenerOptions
  ) => void
  removeEventListener: (
    eventName: 'loadedmetadata' | 'error',
    listener: () => void
  ) => void
}

export interface PlaybackRequestSnapshot {
  requestId: number
  currentTrackId: number | null
}

export type PlaybackEngineAudioEventsOptions = Pick<
  PlaybackEngineRuntimeRefs,
  'playbackSpeedRef' | 'volumeRef'
>

export type PlaybackEngineRuntimeSyncOptions = PlaybackEngineRuntimeRefs & {
  config: PlaybackResolverConfig
  quality: AudioQualityLevel
  equalizer: EqualizerConfig
  playbackFadeEnabled: AppConfig['playbackFadeEnabled']
  playbackSpeed: AppConfig['playbackSpeed']
  volume: number
  audioOutputDeviceId: AppConfig['audioOutputDeviceId']
}

export type PlaybackEngineTrackLoaderOptions = PlaybackEngineRuntimeRefs & {
  currentTrack: PlaybackStoreState['currentTrack']
  requestId: number
  configLoading: boolean
}

export interface PlaybackEngineTransportEffectsOptions {
  status: PlaybackStoreState['status']
  seekRequestId: number
  seekPosition: number
}
