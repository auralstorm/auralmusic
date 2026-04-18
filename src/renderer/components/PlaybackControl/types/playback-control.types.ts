import type { ReactNode } from 'react'

export interface PlaybackControlProgressOptions {
  duration: number
  hasTrack: boolean
  progress: number
  seekTo: (positionMs: number) => void
}

export interface PlaybackControlTrack {
  name: string
  artistName: string
  coverUrl: string
}

export interface ControlButtonProps {
  label: string
  children: ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
}
