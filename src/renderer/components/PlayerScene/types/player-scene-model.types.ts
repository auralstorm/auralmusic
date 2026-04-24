import type { PlaybackTrack } from '../../../../shared/playback.ts'

export type PlayerBackgroundMode = 'off' | 'static' | 'dynamic'

export interface AmllBackgroundState {
  enabled: boolean
  staticMode: boolean
  playing: boolean
}

export interface PlayerBackgroundOverlayState {
  ambientOpacity: number
  lyricPanelOpacity: number
  vignetteOpacity: number
  glowOpacity: number
  bottomOpacity: number
}

export interface ResolvePlayerBackgroundOverlayStateInput {
  enabled: boolean
  staticMode: boolean
  isDarkTheme: boolean
}

export type PlayerSceneChromeEvent =
  | 'scene-opened'
  | 'pointer-activity'
  | 'hide-timeout'

export interface PlayerSceneChromeState {
  visible: boolean
  hideDelayMs: number | null
}

export interface UsePlayerSceneChromeVisibilityOptions {
  immersiveEnabled: boolean
  isOpen: boolean
}

export interface KaraokeSegment {
  start: number
  duration: number
  text: string
}

export interface LyricLine {
  time: number
  text: string
  translation?: string
  duration?: number
  segments?: KaraokeSegment[]
}

export interface KaraokeLine {
  time: number
  duration: number
  text: string
  segments: KaraokeSegment[]
}

export interface BuildLyricLinesInput {
  lrc: string
  tlyric?: string
  yrc?: string
}

export interface LyricTextBundle {
  lrc: string
  tlyric: string
  yrc: string
}

export interface AdaptLyricsToAmllOptions {
  showTranslation: boolean
  karaokeEnabled: boolean
}

export interface AmllLyricLineClickEvent {
  lineIndex?: number
  line?: {
    getLine: () => {
      startTime?: number | null
    }
  } | null
}

export interface UsePlayerLyricsParams {
  isOpen: boolean
  trackId?: number | string
  currentTrack?: PlaybackTrack | null
}
