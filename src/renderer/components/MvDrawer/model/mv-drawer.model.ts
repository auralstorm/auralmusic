import { Volume1, Volume2, VolumeX, type LucideIcon } from 'lucide-react'

import type { MvDrawerViewState } from '../types'

export const MV_DRAWER_INITIAL_STATE: MvDrawerViewState = {
  hero: null,
  playback: null,
  loading: false,
  error: '',
}

export const MV_DRAWER_INITIAL_PLAYBACK_STATE = {
  currentTime: 0,
  duration: 0,
  isMuted: false,
  isPlaying: false,
  volume: 100,
}

export function pickMvPlaybackQuality(resolutions: number[]) {
  const availableResolutions = resolutions.filter(Boolean).sort((a, b) => a - b)

  if (availableResolutions.length === 0) {
    return 1080
  }

  return availableResolutions[availableResolutions.length - 1] || 1080
}

export function formatMvDrawerTime(value: number) {
  const totalSeconds = Math.max(0, Math.floor(value))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function formatMvDrawerRemainingTime(
  currentTime: number,
  duration: number
) {
  return `-${formatMvDrawerTime(Math.max(duration - currentTime, 0))}`
}

export function resolveMvDrawerVolumeIcon(
  isMuted: boolean,
  volume: number
): LucideIcon {
  if (isMuted || volume <= 0) {
    return VolumeX
  }

  if (volume <= 45) {
    return Volume1
  }

  return Volume2
}
