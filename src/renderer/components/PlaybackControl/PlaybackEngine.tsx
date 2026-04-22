import { forwardRef, useImperativeHandle, useRef } from 'react'
import { playbackRuntime } from '@/audio/playback-runtime/playback-runtime'
import { normalizePlaybackSpeedValue } from '@/pages/Settings/components/playback-speed.model'
import { useConfigStore } from '@/stores/config-store'
import { usePlaybackStore } from '@/stores/playback-store'
import type { CurrentPlaybackSource, PlaybackEngineRef } from './types'
import { usePlaybackEngineAudioEvents } from './usePlaybackEngineAudioEvents'
import { usePlaybackEngineRuntimeSync } from './usePlaybackEngineRuntimeSync'
import { usePlaybackEngineTrackLoader } from './usePlaybackEngineTrackLoader'
import { usePlaybackEngineTransportEffects } from './usePlaybackEngineTransportEffects'

const PlaybackEngine = forwardRef<PlaybackEngineRef>((_, ref) => {
  const volumeRef = useRef(70)
  const configRef = useRef(useConfigStore.getState().config)
  const qualityRef = useRef(useConfigStore.getState().config.quality)
  const equalizerRef = useRef(useConfigStore.getState().config.equalizer)
  const currentPlaybackSourceRef = useRef<CurrentPlaybackSource | null>(null)
  const playbackSpeedRef = useRef(
    normalizePlaybackSpeedValue(useConfigStore.getState().config.playbackSpeed)
  )
  const audioOutputDeviceIdRef = useRef(
    useConfigStore.getState().config.audioOutputDeviceId
  )

  const currentTrack = usePlaybackStore(state => state.currentTrack)
  const requestId = usePlaybackStore(state => state.requestId)
  const status = usePlaybackStore(state => state.status)
  const seekRequestId = usePlaybackStore(state => state.seekRequestId)
  const seekPosition = usePlaybackStore(state => state.seekPosition)
  const config = useConfigStore(state => state.config)
  const configLoading = useConfigStore(state => state.isLoading)
  const quality = useConfigStore(state => state.config.quality)
  const playbackSpeed = useConfigStore(state => state.config.playbackSpeed)
  const equalizer = useConfigStore(state => state.config.equalizer)
  const playbackFadeEnabled = useConfigStore(
    state => state.config.playbackFadeEnabled
  )
  const volume = usePlaybackStore(state => state.volume)
  const audioOutputDeviceId = useConfigStore(
    state => state.config.audioOutputDeviceId
  )

  useImperativeHandle(
    ref,
    () => ({
      getAudioElement: () => playbackRuntime.getAudioElement(),
    }),
    []
  )

  usePlaybackEngineRuntimeSync({
    volumeRef,
    configRef,
    qualityRef,
    equalizerRef,
    currentPlaybackSourceRef,
    playbackSpeedRef,
    audioOutputDeviceIdRef,
    config,
    quality,
    equalizer,
    playbackFadeEnabled,
    playbackSpeed,
    volume,
    audioOutputDeviceId,
  })

  usePlaybackEngineAudioEvents({
    playbackSpeedRef,
    volumeRef,
  })

  usePlaybackEngineTrackLoader({
    volumeRef,
    configRef,
    qualityRef,
    equalizerRef,
    currentPlaybackSourceRef,
    playbackSpeedRef,
    audioOutputDeviceIdRef,
    currentTrack,
    requestId,
    configLoading,
  })

  usePlaybackEngineTransportEffects({
    status,
    seekRequestId,
    seekPosition,
  })

  return null
})

export default PlaybackEngine
