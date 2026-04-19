import type {
  PlaybackMode,
  PlaybackTrack,
} from '../../../../shared/playback.ts'
import type { PlaybackControlTrack } from '../types'

export const PLAYBACK_MODE_LABELS: Record<PlaybackMode, string> = {
  'repeat-all': '\u5faa\u73af\u64ad\u653e',
  shuffle: '\u968f\u673a\u64ad\u653e',
  'repeat-one': '\u5355\u66f2\u5faa\u73af',
}

export const DEFAULT_PLAYBACK_CONTROL_TRACK: PlaybackControlTrack = {
  name: '\u6682\u65e0\u64ad\u653e\u6b4c\u66f2',
  artistName: 'AuralMusic',
  coverUrl:
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="%2393c5fd"/><stop offset="1" stop-color="%23f9a8d4"/></linearGradient></defs><rect width="128" height="128" rx="24" fill="url(%23g)"/><path d="M78 31v47.5a16 16 0 1 1-8-13.85V42.2l-30 6.24V84.5a16 16 0 1 1-8-13.85V42z" fill="white" fill-opacity=".88"/></svg>',
}

export function clampPlaybackPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(100, Math.max(0, value))
}

export function createPlaybackControlTrack(
  track: PlaybackTrack | null
): PlaybackControlTrack {
  if (!track) {
    return DEFAULT_PLAYBACK_CONTROL_TRACK
  }

  return {
    name: track.name,
    artistName: track.artistNames,
    coverUrl: track.coverUrl,
  }
}

export function getPlaybackTransportState(input: {
  track: PlaybackTrack | null
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error'
}) {
  return {
    hasTrack: Boolean(input.track),
    isPlaying: input.status === 'playing' || input.status === 'loading',
  }
}

export function getPlaybackProgressViewState(
  duration: number,
  progress: number,
  dragProgress: number | null
) {
  const maxProgress = Math.max(duration, 1)

  return {
    maxProgress,
    currentProgress: Math.min(dragProgress ?? progress, maxProgress),
  }
}

export function getPlaybackModeLabel(playbackMode: PlaybackMode) {
  return PLAYBACK_MODE_LABELS[playbackMode]
}
