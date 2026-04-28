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
  // 当前播放队列，所有播放控制都围绕这份快照推进。
  queue: [],
  // 队列来源标识，用于列表/详情页刷新后把当前播放队列同步到最新数据。
  queueSourceKey: null,
  // 当前播放项在 queue 中的位置；-1 表示没有可播放项。
  currentIndex: -1,
  // 当前正在加载或播放的歌曲，播放器 UI 和元数据补全都依赖它。
  currentTrack: null,
  // 当前播放模式，默认列表循环。
  playbackMode: 'repeat-all' as PlaybackMode,
  // 随机播放时的队列索引顺序，避免每次 next 都重新随机导致回退失真。
  shuffleOrder: [],
  // 随机播放游标，标记 shuffleOrder 中当前播放位置。
  shuffleCursor: 0,
  // 播放器运行态：空闲、加载中、播放、暂停或错误。
  status: 'idle' as PlaybackStatus,
  // 切歌加载完成后是否自动播放，用于区分用户恢复会话和主动点播。
  shouldAutoPlayOnLoad: true,
  // 当前播放进度，单位毫秒。
  progress: 0,
  // 会话恢复时等待音频元数据就绪后再写入的进度，单位毫秒。
  pendingRestoreProgress: 0,
  // 当前音频总时长，单位毫秒。
  duration: 0,
  // 当前音量百分比，范围 0-100。
  volume: 70,
  // 最近一次非静音音量，用于静音恢复。
  lastAudibleVolume: 70,
  // 播放错误文案，展示层直接读取。
  error: '',
  // 播放请求序号，每次切歌/重试递增，用于淘汰旧异步加载结果。
  requestId: 0,
  // seek 请求序号，通知音频 runtime 执行一次新的跳转。
  seekRequestId: 0,
  // 最近一次 seek 目标进度，单位毫秒。
  seekPosition: 0,
  // 播放沉浸场景开关，和底栏播放状态解耦。
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

  // 从指定索引开始播放一组歌曲，并记录队列来源以便后续同步。
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

  // 播放当前队列中的指定索引，保留队列来源和播放模式。
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

  // 追加歌曲到当前队列，按歌曲 id 去重，不打断正在播放的歌曲。
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

  // 用同一来源的新列表刷新队列，同时固定当前播放歌曲不被列表刷新挤掉。
  syncQueueFromSource: (sourceKey, tracks) => {
    if (!sourceKey) {
      return
    }

    const nextSnapshot = createPlaybackQueueSnapshot(tracks, 0)

    if (!nextSnapshot.queue.length) {
      return
    }

    set(state => {
      if (state.queueSourceKey !== sourceKey || !state.currentTrack) {
        return state
      }

      const nextCurrentIndex = nextSnapshot.queue.findIndex(
        track => track.id === state.currentTrack?.id
      )

      if (nextCurrentIndex >= 0) {
        const reconciledQueue = nextSnapshot.queue.map((track, index) =>
          index === nextCurrentIndex ? state.currentTrack! : track
        )

        if (
          isSamePlaybackQueue(state.queue, reconciledQueue) &&
          nextCurrentIndex === state.currentIndex
        ) {
          return state
        }

        return {
          queue: reconciledQueue,
          currentIndex: nextCurrentIndex,
          currentTrack: state.currentTrack,
          shuffleOrder:
            state.playbackMode === 'shuffle'
              ? createShuffleOrder(reconciledQueue.length, nextCurrentIndex)
              : [],
          shuffleCursor: 0,
        }
      }

      const queueWithoutCurrentTrack = nextSnapshot.queue.filter(
        track => track.id !== state.currentTrack?.id
      )
      const pinnedCurrentIndex = Math.min(
        Math.max(state.currentIndex, 0),
        queueWithoutCurrentTrack.length
      )
      const reconciledQueue = [...queueWithoutCurrentTrack]
      reconciledQueue.splice(pinnedCurrentIndex, 0, state.currentTrack)

      if (
        isSamePlaybackQueue(state.queue, reconciledQueue) &&
        pinnedCurrentIndex === state.currentIndex
      ) {
        return state
      }

      return {
        queue: reconciledQueue,
        currentIndex: pinnedCurrentIndex,
        currentTrack: state.currentTrack,
        shuffleOrder:
          state.playbackMode === 'shuffle'
            ? createShuffleOrder(reconciledQueue.length, pinnedCurrentIndex)
            : [],
        shuffleCursor: 0,
      }
    })
  },

  // 后台补封面/歌词后同步更新队列和当前歌曲，避免用户切歌才看到新元数据。
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

  // 切换播放/暂停；错误态下会递增 requestId 触发当前歌曲重载。
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

  // 切换播放模式，并在随机模式下重建以当前歌曲为起点的随机队列。
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

  // 根据播放模式推进下一首；自动结束和手动下一首的 repeat-one 规则不同。
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

  // 根据播放模式回到上一首，随机模式使用 shuffle 游标回退。
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

  // 写入 runtime 同步后的播放进度，负数统一归零。
  setProgress: progress => set({ progress: Math.max(0, progress) }),
  // 写入当前音频时长，避免非法时长污染进度条上限。
  setDuration: duration => set({ duration: Math.max(0, duration) }),
  // 更新音量并记录最近非零音量，供静音恢复使用。
  setVolume: volume => {
    const nextVolume = clampPercent(volume)

    set(state => ({
      volume: nextVolume,
      lastAudibleVolume:
        nextVolume > 0 ? nextVolume : state.lastAudibleVolume || 70,
    }))
  },
  // 在静音和最近一次非零音量之间切换。
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
  // 发起一次 seek，请求序号递增让音频 runtime 区分重复位置点击。
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
  // 直接设置沉浸播放器打开状态，供受控 UI 使用。
  setPlayerSceneOpen: open => set({ isPlayerSceneOpen: open }),
  // 打开沉浸播放器场景。
  openPlayerScene: () => set({ isPlayerSceneOpen: true }),
  // 关闭沉浸播放器场景。
  closePlayerScene: () => set({ isPlayerSceneOpen: false }),
  // 从本地会话快照恢复队列和进度，但默认保持暂停，避免启动后自动出声。
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
  // 音频 runtime 完成恢复进度后清空待恢复标记。
  clearPendingRestoreProgress: () => set({ pendingRestoreProgress: 0 }),
  // 标记当前音源正在加载。
  markPlaybackLoading: () => set({ status: 'loading', error: '' }),
  // 标记当前音源已进入播放态。
  markPlaybackPlaying: () => set({ status: 'playing', error: '' }),
  // 标记播放暂停，不清理错误文案以外的队列状态。
  markPlaybackPaused: () => set({ status: 'paused' }),
  // 标记播放失败并保存展示文案。
  markPlaybackError: error => set({ status: 'error', error }),
  // 清空播放队列和运行态，回到播放器初始状态。
  resetPlayback: () => set(INITIAL_PLAYBACK_STATE),
}))
