import { useEffect } from 'react'
import { useConfigStore } from '@/stores/config-store'
import { usePlaybackStore } from '@/stores/playback-store'
import {
  getNextPlaybackMode,
  normalizePlaybackMode,
  normalizePlaybackVolume,
} from '../../../shared/playback.ts'
import { clampPlaybackPercent, getPlaybackModeLabel } from './model'

export function usePlaybackControlPreferences() {
  const volume = usePlaybackStore(state => state.volume)
  const playbackMode = usePlaybackStore(state => state.playbackMode)
  const setPlaybackMode = usePlaybackStore(state => state.setPlaybackMode)
  const setVolume = usePlaybackStore(state => state.setVolume)
  const toggleMute = usePlaybackStore(state => state.toggleMute)
  const isConfigLoading = useConfigStore(state => state.isLoading)
  const persistedVolume = useConfigStore(state => state.config.playbackVolume)
  const persistedPlaybackMode = useConfigStore(
    state => state.config.playbackMode
  )
  const setConfig = useConfigStore(state => state.setConfig)

  const volumePercent = clampPlaybackPercent(volume)

  useEffect(() => {
    if (isConfigLoading) {
      return
    }

    setVolume(normalizePlaybackVolume(persistedVolume))
    setPlaybackMode(normalizePlaybackMode(persistedPlaybackMode))
  }, [
    isConfigLoading,
    persistedPlaybackMode,
    persistedVolume,
    setPlaybackMode,
    setVolume,
  ])

  const handleVolumeChange = (value: number[]) => {
    setVolume(normalizePlaybackVolume(value[0]))
  }

  const handleVolumeCommit = (value: number[]) => {
    void setConfig('playbackVolume', normalizePlaybackVolume(value[0]))
  }

  const handleToggleMute = () => {
    toggleMute()
    void setConfig(
      'playbackVolume',
      normalizePlaybackVolume(usePlaybackStore.getState().volume)
    )
  }

  const handleTogglePlaybackMode = () => {
    const nextMode = getNextPlaybackMode(playbackMode)

    setPlaybackMode(nextMode)
    void setConfig('playbackMode', nextMode)
  }

  return {
    isMuted: volumePercent === 0,
    playbackMode,
    playbackModeLabel: getPlaybackModeLabel(playbackMode),
    volumePercent,
    handleToggleMute,
    handleTogglePlaybackMode,
    handleVolumeChange,
    handleVolumeCommit,
  }
}
