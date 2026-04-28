import type { LyricPlayerProps } from '@applemusic-like-lyrics/react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type {
  PlayerArtworkStyle,
  RetroCoverPreset,
} from '../../../../shared/config.ts'

import type { LyricLine } from './player-scene-model.types'

export interface PlayerSceneAmllBackgroundProps {
  coverUrl: string
  playing: boolean
  hasLyrics: boolean
  enabled: boolean
  staticMode: boolean
}

export interface PlayerSceneAmllBackgroundOverlayProps {
  enabled: boolean
  staticMode: boolean
  isDarkTheme: boolean
}

export interface PlayerSceneAmllLyricsProps {
  trackId: number | null
  lines: LyricLine[]
  progressMs: number
  showTranslation: boolean
  karaokeEnabled: boolean
  playing: boolean
  loading: boolean
  error: string
  onSeek: (positionMs: number) => void
}

export type LyricLineClickHandler = NonNullable<
  LyricPlayerProps['onLyricLineClick']
>

export interface PlayerSceneArtworkProps {
  coverUrl: string
  title: string
  artistNames: string
  isPlaying: boolean
  dynamicCoverEnabled: boolean
  retroCoverPreset: RetroCoverPreset
  playerArtworkStyle: PlayerArtworkStyle
  isSceneOpen: boolean
}

export interface PlayerSceneChromeButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  children: ReactNode
  position: 'left' | 'right'
  visible: boolean
  onReveal: () => void
}

export interface PlayerSceneControlsProps {
  disabled: boolean
  isPlaying: boolean
  onPrevious: () => void
  onTogglePlay: () => void
  onNext: () => void
}

export interface SceneControlButtonProps {
  label: string
  disabled?: boolean
  variant?: 'default' | 'primary'
  children: ReactNode
  onClick: () => void
}

export interface PlayerSceneLyricsProps {
  lines: LyricLine[]
  activeIndex: number
  progressMs: number
  showTranslation: boolean
  karaokeEnabled: boolean
  loading: boolean
  error: string
}

export interface PlayerSceneProgressProps {
  disabled: boolean
  progress: number
  duration: number
  onSeek: (positionMs: number) => void
}

export interface PlayerScenePixiCoverProps {
  src: string
  className?: string
  shouldAnimate: boolean
  isVisible: boolean
  retroCoverPreset: RetroCoverPreset
}
