import { create } from 'zustand'
import {
  createPlaybackQueueSnapshot,
  createShuffleOrder,
  normalizePlaybackMode,
  resolvePlaybackQueueStep,
} from '../../shared/playback.ts'
import type {
  PlaybackMode,
  PlaybackStatus,
  PlaybackTrack,
} from '../../shared/playback.ts'
import type { PlaybackStoreState } from '@/types/core'

const INITIAL_PLAYBACK_STATE = {
  queue: [],
  queueSourceKey: null,
  currentIndex: -1,
  currentTrack: null,
  playbackMode: 'repeat-all' as PlaybackMode,
  shuffleOrder: [],
  shuffleCursor: 0,
  status: 'idle' as PlaybackStatus,
  shouldAutoPlayOnLoad: true,
  progress: 0,
  pendingRestoreProgress: 0,
  duration: 0,
  volume: 70,
  lastAudibleVolume: 70,
  error: '',
  requestId: 0,
  seekRequestId: 0,
  seekPosition: 0,
  isPlayerSceneOpen: false,
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(100, Math.max(0, value))
}

function appendUniquePlaybackTracks(
  queue: PlaybackTrack[],
  appendedTracks: PlaybackTrack[]
) {
  if (!queue.length) {
    const seenTrackIds = new Set<number>()

    return appendedTracks.filter(track => {
      if (seenTrackIds.has(track.id)) {
        return false
      }

      seenTrackIds.add(track.id)
      return true
    })
  }

  const seenTrackIds = new Set(queue.map(track => track.id))
  const nextTracks = [...queue]

  for (const track of appendedTracks) {
    if (seenTrackIds.has(track.id)) {
      continue
    }

    seenTrackIds.add(track.id)
    nextTracks.push(track)
  }

  return nextTracks
}

function createTrackPatch(
  queue: PlaybackTrack[],
  currentIndex: number,
  requestId: number
) {
  const currentTrack = queue[currentIndex] || null

  return {
    currentIndex,
    currentTrack,
    status: currentTrack
      ? ('loading' as PlaybackStatus)
      : ('idle' as PlaybackStatus),
    shouldAutoPlayOnLoad: true,
    progress: 0,
    pendingRestoreProgress: 0,
    duration: currentTrack?.duration || 0,
    error: '',
    requestId: currentTrack ? requestId + 1 : requestId,
  }
}

function patchPlaybackTrack(
  track: PlaybackTrack,
  patch: Partial<
    Pick<PlaybackTrack, 'coverUrl' | 'lyricText' | 'translatedLyricText'>
  >
) {
  const nextPatch: Partial<PlaybackTrack> = {}

  if (typeof patch.coverUrl === 'string' && patch.coverUrl.trim()) {
    nextPatch.coverUrl = patch.coverUrl.trim()
  }

  if (typeof patch.lyricText === 'string') {
    nextPatch.lyricText = patch.lyricText
  }

  if (typeof patch.translatedLyricText === 'string') {
    nextPatch.translatedLyricText = patch.translatedLyricText
  }

  if (Object.keys(nextPatch).length === 0) {
    return track
  }

  const nextTrack = {
    ...track,
    ...nextPatch,
  }

  if (
    nextTrack.coverUrl === track.coverUrl &&
    nextTrack.lyricText === track.lyricText &&
    nextTrack.translatedLyricText === track.translatedLyricText
  ) {
    return track
  }

  return nextTrack
}

function isQueueExtensionOfCurrentQueue(
  currentQueue: PlaybackTrack[],
  nextQueue: PlaybackTrack[]
) {
  if (nextQueue.length < currentQueue.length) {
    return false
  }

  return currentQueue.every((track, index) => nextQueue[index]?.id === track.id)
}

function isSamePlaybackQueue(
  currentQueue: PlaybackTrack[],
  nextQueue: PlaybackTrack[]
) {
  if (currentQueue.length !== nextQueue.length) {
    return false
  }

  return currentQueue.every((track, index) => nextQueue[index]?.id === track.id)
}

export const usePlaybackStore = create<PlaybackStoreState>((set, get) => ({
  ...INITIAL_PLAYBACK_STATE,

  playQueueFromIndex: (tracks, startIndex, sourceKey = null) => {
    const snapshot = createPlaybackQueueSnapshot(tracks, startIndex)
    set(state => ({
      ...snapshot,
      queueSourceKey: snapshot.currentTrack ? sourceKey : null,
      shuffleOrder:
        state.playbackMode === 'shuffle' && snapshot.currentTrack
          ? createShuffleOrder(snapshot.queue.length, snapshot.currentIndex)
          : [],
      shuffleCursor: 0,
      status: snapshot.currentTrack ? 'loading' : 'idle',
      shouldAutoPlayOnLoad: Boolean(snapshot.currentTrack),
      progress: 0,
      duration: snapshot.currentTrack?.duration || 0,
      error: '',
      requestId: snapshot.currentTrack ? state.requestId + 1 : state.requestId,
    }))
  },

  playCurrentQueueIndex: index => {
    set(state => {
      if (
        index < 0 ||
        index >= state.queue.length ||
        index === state.currentIndex
      ) {
        return state
      }

      const currentTrack = state.queue[index]

      if (!currentTrack) {
        return state
      }

      return {
        ...createTrackPatch(state.queue, index, state.requestId),
        queue: state.queue,
        queueSourceKey: state.queueSourceKey,
        shuffleOrder:
          state.playbackMode === 'shuffle'
            ? createShuffleOrder(state.queue.length, index)
            : state.shuffleOrder,
        shuffleCursor: 0,
      }
    })
  },

  appendToQueue: tracks => {
    const appendedTracks = createPlaybackQueueSnapshot(tracks, 0).queue

    if (!appendedTracks.length) {
      return
    }

    set(state => {
      const nextQueue = appendUniquePlaybackTracks(state.queue, appendedTracks)
      const hasCurrentTrack = Boolean(state.currentTrack)

      return {
        queue: nextQueue,
        queueSourceKey: hasCurrentTrack ? state.queueSourceKey : null,
        currentIndex: hasCurrentTrack ? state.currentIndex : -1,
        currentTrack: hasCurrentTrack ? state.currentTrack : null,
        shuffleOrder:
          state.playbackMode === 'shuffle' && hasCurrentTrack
            ? createShuffleOrder(nextQueue.length, state.currentIndex)
            : [],
        shuffleCursor: 0,
        status: hasCurrentTrack ? state.status : 'idle',
        shouldAutoPlayOnLoad: hasCurrentTrack
          ? state.shouldAutoPlayOnLoad
          : false,
        progress: hasCurrentTrack ? state.progress : 0,
        pendingRestoreProgress: hasCurrentTrack
          ? state.pendingRestoreProgress
          : 0,
        duration: hasCurrentTrack ? state.duration : 0,
        error: hasCurrentTrack ? state.error : '',
        requestId: state.requestId,
      }
    })
  },

  syncQueueFromSource: (sourceKey, tracks) => {
    if (!sourceKey) {
      return
    }

    const nextSnapshot = createPlaybackQueueSnapshot(tracks, 0)

    if (!nextSnapshot.queue.length) {
      return
    }

    set(state => {
      if (
        state.queueSourceKey !== sourceKey ||
        !state.currentTrack ||
        !isQueueExtensionOfCurrentQueue(state.queue, nextSnapshot.queue)
      ) {
        return state
      }

      const nextCurrentIndex = nextSnapshot.queue.findIndex(
        track => track.id === state.currentTrack?.id
      )

      if (nextCurrentIndex < 0) {
        return state
      }

      if (
        isSamePlaybackQueue(state.queue, nextSnapshot.queue) &&
        nextCurrentIndex === state.currentIndex
      ) {
        return state
      }

      return {
        queue: nextSnapshot.queue,
        currentIndex: nextCurrentIndex,
        currentTrack: state.currentTrack,
        shuffleOrder:
          state.playbackMode === 'shuffle'
            ? createShuffleOrder(nextSnapshot.queue.length, nextCurrentIndex)
            : [],
        shuffleCursor: 0,
      }
    })
  },

  patchTrackMetadata: (trackId, patch) => {
    set(state => {
      let changed = false

      const nextQueue = state.queue.map(track => {
        if (track.id !== trackId) {
          return track
        }

        const nextTrack = patchPlaybackTrack(track, patch)
        if (nextTrack !== track) {
          changed = true
        }

        return nextTrack
      })

      let nextCurrentTrack = state.currentTrack
      if (state.currentTrack?.id === trackId) {
        const patchedCurrentTrack = patchPlaybackTrack(
          state.currentTrack,
          patch
        )
        if (patchedCurrentTrack !== state.currentTrack) {
          changed = true
          nextCurrentTrack = patchedCurrentTrack
        }
      }

      if (!changed) {
        return state
      }

      if (nextQueue[state.currentIndex]?.id === trackId) {
        nextCurrentTrack = nextQueue[state.currentIndex] ?? nextCurrentTrack
      }

      return {
        queue: nextQueue,
        currentTrack: nextCurrentTrack,
      }
    })
  },

  togglePlay: () => {
    const state = get()

    if (!state.currentTrack) {
      return
    }

    if (state.status === 'playing' || state.status === 'loading') {
      set({ status: 'paused' })
      return
    }

    if (state.status === 'error') {
      set({
        status: 'loading',
        shouldAutoPlayOnLoad: true,
        error: '',
        requestId: state.requestId + 1,
      })
      return
    }

    set({ status: 'playing', error: '' })
  },

  setPlaybackMode: mode => {
    const state = get()
    const playbackMode = normalizePlaybackMode(mode)
    const shuffleOrder =
      playbackMode === 'shuffle' && state.currentTrack
        ? createShuffleOrder(state.queue.length, state.currentIndex)
        : []

    set({
      playbackMode,
      shuffleOrder,
      shuffleCursor: 0,
    })
  },

  playNext: (reason = 'manual') => {
    const state = get()
    const step = resolvePlaybackQueueStep({
      queueLength: state.queue.length,
      currentIndex: state.currentIndex,
      playbackMode: state.playbackMode,
      direction: 'next',
      reason,
      shuffleOrder: state.shuffleOrder,
      shuffleCursor: state.shuffleCursor,
    })

    if (step.index === null) {
      set({ status: state.currentTrack ? 'paused' : 'idle' })
      return false
    }

    set({
      ...createTrackPatch(state.queue, step.index, state.requestId),
      shuffleOrder: step.shuffleOrder,
      shuffleCursor: step.shuffleCursor,
    })
    return true
  },

  playPrevious: () => {
    const state = get()
    const step = resolvePlaybackQueueStep({
      queueLength: state.queue.length,
      currentIndex: state.currentIndex,
      playbackMode: state.playbackMode,
      direction: 'previous',
      reason: 'manual',
      shuffleOrder: state.shuffleOrder,
      shuffleCursor: state.shuffleCursor,
    })

    if (step.index === null) {
      return false
    }

    set({
      ...createTrackPatch(state.queue, step.index, state.requestId),
      shuffleOrder: step.shuffleOrder,
      shuffleCursor: step.shuffleCursor,
    })
    return true
  },

  setProgress: progress => set({ progress: Math.max(0, progress) }),
  setDuration: duration => set({ duration: Math.max(0, duration) }),
  setVolume: volume => {
    const nextVolume = clampPercent(volume)

    set(state => ({
      volume: nextVolume,
      lastAudibleVolume:
        nextVolume > 0 ? nextVolume : state.lastAudibleVolume || 70,
    }))
  },
  toggleMute: () => {
    set(state => {
      if (state.volume > 0) {
        return {
          volume: 0,
          lastAudibleVolume: state.volume,
        }
      }

      return {
        volume: state.lastAudibleVolume || 70,
      }
    })
  },
  seekTo: positionMs => {
    const nextPosition = Math.max(
      0,
      Number.isFinite(positionMs) ? positionMs : 0
    )

    set(state => ({
      progress: nextPosition,
      seekPosition: nextPosition,
      seekRequestId: state.seekRequestId + 1,
    }))
  },
  setPlayerSceneOpen: open => set({ isPlayerSceneOpen: open }),
  openPlayerScene: () => set({ isPlayerSceneOpen: true }),
  closePlayerScene: () => set({ isPlayerSceneOpen: false }),
  restoreSession: snapshot => {
    const nextSnapshot = createPlaybackQueueSnapshot(
      snapshot.queue,
      snapshot.currentIndex
    )

    if (!nextSnapshot.currentTrack) {
      return
    }

    const playbackMode = normalizePlaybackMode(snapshot.playbackMode)
    const shuffleOrder =
      playbackMode === 'shuffle'
        ? createShuffleOrder(
            nextSnapshot.queue.length,
            nextSnapshot.currentIndex
          )
        : []

    set(state => ({
      ...nextSnapshot,
      playbackMode,
      shuffleOrder,
      shuffleCursor: 0,
      status: 'paused',
      shouldAutoPlayOnLoad: false,
      progress: Math.max(0, snapshot.progress),
      pendingRestoreProgress: Math.max(0, snapshot.progress),
      duration: Math.max(
        0,
        snapshot.duration || nextSnapshot.currentTrack?.duration || 0
      ),
      error: '',
      requestId: state.requestId + 1,
    }))
  },
  clearPendingRestoreProgress: () => set({ pendingRestoreProgress: 0 }),
  markPlaybackLoading: () => set({ status: 'loading', error: '' }),
  markPlaybackPlaying: () => set({ status: 'playing', error: '' }),
  markPlaybackPaused: () => set({ status: 'paused' }),
  markPlaybackError: error => set({ status: 'error', error }),
  resetPlayback: () => set(INITIAL_PLAYBACK_STATE),
}))
