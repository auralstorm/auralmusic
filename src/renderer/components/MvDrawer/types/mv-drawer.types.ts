import type { MvDetailHeroData, MvPlaybackData } from '@/pages/Mv/types'

export interface MvDrawerViewState {
  hero: MvDetailHeroData | null
  playback: MvPlaybackData | null
  loading: boolean
  error: string
}

export type MvDrawerPlayerRef = HTMLVideoElement

export interface MvDrawerControlBarProps {
  canPlay: boolean
  currentTime: number
  duration: number
  isFullscreen: boolean
  isMuted: boolean
  isPlaying: boolean
  volume: number
  onSeekChange: (value: number[]) => void
  onSeekCommit: (value: number[]) => void
  onToggleFullscreen: () => void
  onToggleMute: () => void
  onTogglePlay: () => void
  onVolumeChange: (value: number[]) => void
}
