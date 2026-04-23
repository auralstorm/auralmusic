import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { playbackRuntime } from '@/audio/playback-runtime/playback-runtime'
import { normalizePlaybackSpeedValue } from '@/pages/Settings/components/playback-speed.model'
import { useConfigStore } from '@/stores/config-store'
import type { PlaybackResolverConfig } from '@/types/core'
import { usePlaybackStore } from '@/stores/playback-store'
import type { CurrentPlaybackSource, PlaybackEngineRef } from './types'
import { usePlaybackEngineAudioEvents } from './usePlaybackEngineAudioEvents'
import { usePlaybackEngineRuntimeSync } from './usePlaybackEngineRuntimeSync'
import { usePlaybackEngineTrackLoader } from './usePlaybackEngineTrackLoader'
import { usePlaybackEngineTransportEffects } from './usePlaybackEngineTransportEffects'

function createPlaybackResolverConfig(
  config: ReturnType<typeof useConfigStore.getState>['config']
): PlaybackResolverConfig {
  return {
    musicSourceEnabled: config.musicSourceEnabled,
    musicSourceProviders: config.musicSourceProviders,
    enhancedSourceModules: config.enhancedSourceModules,
    luoxueSourceEnabled: config.luoxueSourceEnabled,
    luoxueMusicSourceScripts: config.luoxueMusicSourceScripts,
    activeLuoxueMusicSourceScriptId: config.activeLuoxueMusicSourceScriptId,
    customMusicApiEnabled: config.customMusicApiEnabled,
    customMusicApiUrl: config.customMusicApiUrl,
    quality: config.quality,
  }
}

const PlaybackEngine = forwardRef<PlaybackEngineRef>((_, ref) => {
  const initialConfig = useConfigStore.getState().config
  const volumeRef = useRef(70)
  const configRef = useRef(createPlaybackResolverConfig(initialConfig))
  const qualityRef = useRef(initialConfig.quality)
  const equalizerRef = useRef(initialConfig.equalizer)
  const currentPlaybackSourceRef = useRef<CurrentPlaybackSource | null>(null)
  const playbackSpeedRef = useRef(
    normalizePlaybackSpeedValue(initialConfig.playbackSpeed)
  )
  const audioOutputDeviceIdRef = useRef(initialConfig.audioOutputDeviceId)

  const currentTrack = usePlaybackStore(state => state.currentTrack)
  const requestId = usePlaybackStore(state => state.requestId)
  const status = usePlaybackStore(state => state.status)
  const seekRequestId = usePlaybackStore(state => state.seekRequestId)
  const seekPosition = usePlaybackStore(state => state.seekPosition)
  const configLoading = useConfigStore(state => state.isLoading)
  const musicSourceEnabled = useConfigStore(
    state => state.config.musicSourceEnabled
  )
  const musicSourceProviders = useConfigStore(
    state => state.config.musicSourceProviders
  )
  const enhancedSourceModules = useConfigStore(
    state => state.config.enhancedSourceModules
  )
  const luoxueSourceEnabled = useConfigStore(
    state => state.config.luoxueSourceEnabled
  )
  const luoxueMusicSourceScripts = useConfigStore(
    state => state.config.luoxueMusicSourceScripts
  )
  const activeLuoxueMusicSourceScriptId = useConfigStore(
    state => state.config.activeLuoxueMusicSourceScriptId
  )
  const customMusicApiEnabled = useConfigStore(
    state => state.config.customMusicApiEnabled
  )
  const customMusicApiUrl = useConfigStore(
    state => state.config.customMusicApiUrl
  )
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
  const config = useMemo<PlaybackResolverConfig>(
    () => ({
      musicSourceEnabled,
      musicSourceProviders,
      enhancedSourceModules,
      luoxueSourceEnabled,
      luoxueMusicSourceScripts,
      activeLuoxueMusicSourceScriptId,
      customMusicApiEnabled,
      customMusicApiUrl,
      quality,
    }),
    [
      activeLuoxueMusicSourceScriptId,
      customMusicApiEnabled,
      customMusicApiUrl,
      enhancedSourceModules,
      luoxueMusicSourceScripts,
      luoxueSourceEnabled,
      musicSourceEnabled,
      musicSourceProviders,
      quality,
    ]
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
