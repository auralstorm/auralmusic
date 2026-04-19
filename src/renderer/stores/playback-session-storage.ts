import {
  createPlaybackQueueSnapshot,
  normalizePlaybackMode,
} from '../../shared/playback.ts'
import type { PlaybackMode, PlaybackTrack } from '../../shared/playback.ts'
import type {
  PlaybackSessionSnapshot,
  PlaybackSessionStorageLike,
} from '@/types/core'

export type { PlaybackSessionSnapshot } from '@/types/core'

export const PLAYBACK_SESSION_STORAGE_KEY = 'auralmusic:playback-session'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

export function createPlaybackSessionSnapshot(input: {
  queue: PlaybackTrack[]
  currentIndex: number
  progress: number
  duration: number
  playbackMode: PlaybackMode
}): PlaybackSessionSnapshot | null {
  const snapshot = createPlaybackQueueSnapshot(input.queue, input.currentIndex)

  if (!snapshot.currentTrack) {
    return null
  }

  return {
    queue: snapshot.queue,
    currentIndex: snapshot.currentIndex,
    progress: Math.max(0, Math.floor(input.progress)),
    duration: Math.max(0, Math.floor(input.duration)),
    playbackMode: normalizePlaybackMode(input.playbackMode),
  }
}

export function withPlaybackSessionTiming(
  snapshot: PlaybackSessionSnapshot,
  timing: {
    progress: number
    duration: number
  }
): PlaybackSessionSnapshot {
  return {
    ...snapshot,
    progress: Math.max(0, Math.floor(timing.progress)),
    duration: Math.max(0, Math.floor(timing.duration)),
  }
}

export function normalizePlaybackSessionSnapshot(
  value: unknown
): PlaybackSessionSnapshot | null {
  if (!isRecord(value) || !Array.isArray(value.queue)) {
    return null
  }

  const snapshot = createPlaybackQueueSnapshot(
    value.queue,
    typeof value.currentIndex === 'number' ? value.currentIndex : 0
  )

  if (!snapshot.currentTrack) {
    return null
  }

  return {
    queue: snapshot.queue,
    currentIndex: snapshot.currentIndex,
    progress:
      typeof value.progress === 'number' && Number.isFinite(value.progress)
        ? Math.max(0, Math.floor(value.progress))
        : 0,
    duration:
      typeof value.duration === 'number' && Number.isFinite(value.duration)
        ? Math.max(0, Math.floor(value.duration))
        : snapshot.currentTrack.duration || 0,
    playbackMode: normalizePlaybackMode(value.playbackMode),
  }
}

export function readPlaybackSessionSnapshot(
  storage: PlaybackSessionStorageLike
): PlaybackSessionSnapshot | null {
  const raw = storage.getItem(PLAYBACK_SESSION_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    return normalizePlaybackSessionSnapshot(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writePlaybackSessionSnapshot(
  storage: PlaybackSessionStorageLike,
  snapshot: PlaybackSessionSnapshot
) {
  storage.setItem(PLAYBACK_SESSION_STORAGE_KEY, JSON.stringify(snapshot))
}

export function clearPlaybackSessionSnapshot(
  storage: PlaybackSessionStorageLike
) {
  storage.removeItem(PLAYBACK_SESSION_STORAGE_KEY)
}
