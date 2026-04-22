export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

export const PLAYBACK_MODE_SEQUENCE = [
  'repeat-all',
  'shuffle',
  'repeat-one',
] as const

export type PlaybackMode = (typeof PLAYBACK_MODE_SEQUENCE)[number]

export type PlaybackAdvanceReason = 'manual' | 'auto'

export type PlaybackAdvanceDirection = 'next' | 'previous'

export type PlaybackTrack = {
  id: number
  name: string
  artistNames: string
  albumName: string
  coverUrl: string
  duration: number
  sourceUrl?: string
}

const PLAYLIST_QUEUE_SOURCE_PREFIX = 'playlist:'
const LIKED_SONGS_QUEUE_SOURCE_PREFIX = 'liked-songs:'
const ALBUM_QUEUE_SOURCE_PREFIX = 'album:'
const CLOUD_QUEUE_SOURCE_PREFIX = 'cloud:'

export type PlaybackQueueSnapshot = {
  queue: PlaybackTrack[]
  currentIndex: number
  currentTrack: PlaybackTrack | null
}

export type PlaybackQueueSourceDescriptor = {
  type: 'playlist' | 'liked-songs' | 'album' | 'cloud'
  id: number
}

export type SongUrlV1Result = {
  id: number
  url: string
  time: number
  br: number
}

export type PlaybackQueueStepResult = {
  index: number | null
  shuffleOrder: number[]
  shuffleCursor: number
}

type ResolvePlaybackQueueStepOptions = {
  queueLength: number
  currentIndex: number
  playbackMode: PlaybackMode
  direction: PlaybackAdvanceDirection
  reason?: PlaybackAdvanceReason
  shuffleOrder?: number[]
  shuffleCursor?: number
  random?: () => number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function readSongUrlItems(payload: unknown): unknown[] {
  if (!isRecord(payload)) {
    return []
  }

  if (Array.isArray(payload.data)) {
    return payload.data
  }

  const nestedData = payload.data
  if (isRecord(nestedData) && Array.isArray(nestedData.data)) {
    return nestedData.data
  }

  return []
}

export function normalizeSongUrlV1Response(
  payload: unknown
): SongUrlV1Result | null {
  const item = readSongUrlItems(payload).find(candidate => {
    return isRecord(candidate) && typeof candidate.url === 'string'
  })

  if (!isRecord(item) || typeof item.url !== 'string' || !item.url.trim()) {
    return null
  }

  return {
    id: typeof item.id === 'number' ? item.id : 0,
    url: item.url,
    time: typeof item.time === 'number' ? item.time : 0,
    br: typeof item.br === 'number' ? item.br : 0,
  }
}

export function normalizeSongUrlMatchResponse(
  payload: unknown,
  fallback: Pick<SongUrlV1Result, 'id' | 'time' | 'br'>
): SongUrlV1Result | null {
  if (!isRecord(payload)) {
    return null
  }

  const root = isRecord(payload.data) ? payload.data : payload
  const url =
    typeof root.data === 'string' && root.data.trim()
      ? root.data.trim()
      : typeof root.url === 'string' && root.url.trim()
        ? root.url.trim()
        : ''

  if (!url) {
    return null
  }

  return {
    id: fallback.id,
    url,
    time: fallback.time,
    br: fallback.br,
  }
}

export function createSongUrlRequestAttempts(unblockEnabled: boolean) {
  return unblockEnabled ? [false, true] : [false]
}

export function normalizePlaybackVolume(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 70
  }

  return Math.min(100, Math.max(0, Math.round(value)))
}

export function normalizePlaybackMode(value: unknown): PlaybackMode {
  if (
    typeof value === 'string' &&
    PLAYBACK_MODE_SEQUENCE.includes(value as PlaybackMode)
  ) {
    return value as PlaybackMode
  }

  return 'repeat-all'
}

export function getNextPlaybackMode(mode: PlaybackMode): PlaybackMode {
  const currentIndex = PLAYBACK_MODE_SEQUENCE.indexOf(mode)
  const nextIndex =
    currentIndex >= 0 ? (currentIndex + 1) % PLAYBACK_MODE_SEQUENCE.length : 0

  return PLAYBACK_MODE_SEQUENCE[nextIndex]
}

export function normalizePlaybackTrack(track: unknown): PlaybackTrack | null {
  if (!isRecord(track)) {
    return null
  }

  const id = typeof track.id === 'number' ? track.id : 0
  const name = typeof track.name === 'string' ? track.name.trim() : ''

  if (!id || !name) {
    return null
  }

  return {
    id,
    name,
    artistNames:
      typeof track.artistNames === 'string' && track.artistNames.trim()
        ? track.artistNames.trim()
        : '未知歌手',
    albumName:
      typeof track.albumName === 'string' && track.albumName.trim()
        ? track.albumName.trim()
        : '未知专辑',
    coverUrl: typeof track.coverUrl === 'string' ? track.coverUrl : '',
    duration: typeof track.duration === 'number' ? track.duration : 0,
    sourceUrl:
      typeof track.sourceUrl === 'string' && track.sourceUrl.trim()
        ? track.sourceUrl.trim()
        : undefined,
  }
}

export function createPlaybackQueueSnapshot(
  tracks: unknown[],
  startIndex: number
): PlaybackQueueSnapshot {
  const queue = tracks
    .map(track => normalizePlaybackTrack(track))
    .filter((track): track is PlaybackTrack => Boolean(track))

  if (!queue.length) {
    return {
      queue: [],
      currentIndex: -1,
      currentTrack: null,
    }
  }

  const currentIndex = Math.min(
    Math.max(Number.isFinite(startIndex) ? startIndex : 0, 0),
    queue.length - 1
  )

  return {
    queue,
    currentIndex,
    currentTrack: queue[currentIndex] || null,
  }
}

export function createPlaylistQueueSourceKey(playlistId: number | string) {
  return createPrefixedQueueSourceKey(PLAYLIST_QUEUE_SOURCE_PREFIX, playlistId)
}

export function createLikedSongsQueueSourceKey(playlistId: number | string) {
  return createPrefixedQueueSourceKey(
    LIKED_SONGS_QUEUE_SOURCE_PREFIX,
    playlistId
  )
}

export function createAlbumQueueSourceKey(albumId: number | string) {
  return createPrefixedQueueSourceKey(ALBUM_QUEUE_SOURCE_PREFIX, albumId)
}

export function createCloudQueueSourceKey(userId: number | string) {
  return createPrefixedQueueSourceKey(CLOUD_QUEUE_SOURCE_PREFIX, userId)
}

function createPrefixedQueueSourceKey(
  prefix: string,
  sourceId: number | string
) {
  const normalizedId =
    typeof sourceId === 'number'
      ? sourceId
      : Number.parseInt(String(sourceId), 10)

  return normalizedId > 0 ? `${prefix}${normalizedId}` : prefix
}

export function resolvePlaylistIdFromQueueSourceKey(
  sourceKey: string | null | undefined
) {
  return resolvePrefixedQueueSourceId(sourceKey, PLAYLIST_QUEUE_SOURCE_PREFIX)
}

function resolvePrefixedQueueSourceId(
  sourceKey: string | null | undefined,
  prefix: string
) {
  if (typeof sourceKey !== 'string' || !sourceKey.startsWith(prefix)) {
    return null
  }

  const sourceId = Number.parseInt(sourceKey.slice(prefix.length), 10)

  return sourceId > 0 ? sourceId : null
}

export function resolveQueueSourceDescriptor(
  sourceKey: string | null | undefined
): PlaybackQueueSourceDescriptor | null {
  const playlistId = resolvePrefixedQueueSourceId(
    sourceKey,
    PLAYLIST_QUEUE_SOURCE_PREFIX
  )
  if (playlistId) {
    return {
      type: 'playlist',
      id: playlistId,
    }
  }

  const likedSongsId = resolvePrefixedQueueSourceId(
    sourceKey,
    LIKED_SONGS_QUEUE_SOURCE_PREFIX
  )
  if (likedSongsId) {
    return {
      type: 'liked-songs',
      id: likedSongsId,
    }
  }

  const albumId = resolvePrefixedQueueSourceId(
    sourceKey,
    ALBUM_QUEUE_SOURCE_PREFIX
  )
  if (albumId) {
    return {
      type: 'album',
      id: albumId,
    }
  }

  const cloudUserId = resolvePrefixedQueueSourceId(
    sourceKey,
    CLOUD_QUEUE_SOURCE_PREFIX
  )
  if (cloudUserId) {
    return {
      type: 'cloud',
      id: cloudUserId,
    }
  }

  return null
}

export function getNextQueueIndex(
  queue: PlaybackTrack[],
  currentIndex: number
) {
  const nextIndex = currentIndex + 1

  return nextIndex < queue.length ? nextIndex : null
}

export function getPreviousQueueIndex(
  queue: PlaybackTrack[],
  currentIndex: number
) {
  const previousIndex = currentIndex - 1

  return queue.length > 0 && previousIndex >= 0 ? previousIndex : null
}

function clampQueueIndex(queueLength: number, currentIndex: number) {
  if (queueLength <= 0) {
    return -1
  }

  if (!Number.isFinite(currentIndex)) {
    return 0
  }

  return Math.min(queueLength - 1, Math.max(0, currentIndex))
}

function readRandomIndex(random: () => number, upperBound: number) {
  const value = random()
  const safeValue = Number.isFinite(value) ? value : 0

  return Math.min(
    upperBound - 1,
    Math.max(0, Math.floor(safeValue * upperBound))
  )
}

function isCompleteShuffleOrder(order: number[], queueLength: number) {
  if (order.length !== queueLength) {
    return false
  }

  const seen = new Set(order)

  if (seen.size !== queueLength) {
    return false
  }

  for (let index = 0; index < queueLength; index += 1) {
    if (!seen.has(index)) {
      return false
    }
  }

  return true
}

export function createShuffleOrder(
  queueLength: number,
  currentIndex: number,
  random: () => number = Math.random
) {
  if (queueLength <= 0) {
    return []
  }

  const safeCurrentIndex = clampQueueIndex(queueLength, currentIndex)
  const remainingIndexes = Array.from({ length: queueLength }, (_, index) => {
    return index
  }).filter(index => index !== safeCurrentIndex)

  for (let index = remainingIndexes.length - 1; index > 0; index -= 1) {
    const swapIndex = readRandomIndex(random, index + 1)
    const currentValue = remainingIndexes[index]
    remainingIndexes[index] = remainingIndexes[swapIndex]
    remainingIndexes[swapIndex] = currentValue
  }

  return [safeCurrentIndex, ...remainingIndexes]
}

function resolveShuffleState(
  queueLength: number,
  currentIndex: number,
  shuffleOrder: number[] | undefined,
  shuffleCursor: number | undefined,
  random: () => number
) {
  const safeCurrentIndex = clampQueueIndex(queueLength, currentIndex)
  const order = Array.isArray(shuffleOrder) ? shuffleOrder : []

  if (!isCompleteShuffleOrder(order, queueLength)) {
    return {
      shuffleOrder: createShuffleOrder(queueLength, safeCurrentIndex, random),
      shuffleCursor: 0,
    }
  }

  const safeCursor =
    typeof shuffleCursor === 'number' && Number.isFinite(shuffleCursor)
      ? Math.min(queueLength - 1, Math.max(0, shuffleCursor))
      : order.indexOf(safeCurrentIndex)

  if (order[safeCursor] === safeCurrentIndex) {
    return {
      shuffleOrder: order,
      shuffleCursor: safeCursor,
    }
  }

  const currentCursor = order.indexOf(safeCurrentIndex)

  if (currentCursor >= 0) {
    return {
      shuffleOrder: order,
      shuffleCursor: currentCursor,
    }
  }

  return {
    shuffleOrder: createShuffleOrder(queueLength, safeCurrentIndex, random),
    shuffleCursor: 0,
  }
}

function resolveRepeatQueueIndex(
  queueLength: number,
  currentIndex: number,
  direction: PlaybackAdvanceDirection
) {
  if (queueLength <= 0) {
    return null
  }

  const safeCurrentIndex = clampQueueIndex(queueLength, currentIndex)

  if (direction === 'previous') {
    return safeCurrentIndex > 0 ? safeCurrentIndex - 1 : queueLength - 1
  }

  return safeCurrentIndex + 1 < queueLength ? safeCurrentIndex + 1 : 0
}

function resolveShuffleQueueStep({
  queueLength,
  currentIndex,
  direction,
  shuffleOrder,
  shuffleCursor,
  random,
}: ResolvePlaybackQueueStepOptions): PlaybackQueueStepResult {
  const state = resolveShuffleState(
    queueLength,
    currentIndex,
    shuffleOrder,
    shuffleCursor,
    random || Math.random
  )

  if (queueLength <= 1) {
    return {
      index: state.shuffleOrder[0] ?? null,
      shuffleOrder: state.shuffleOrder,
      shuffleCursor: 0,
    }
  }

  if (direction === 'previous') {
    if (state.shuffleCursor > 0) {
      const nextCursor = state.shuffleCursor - 1

      return {
        index: state.shuffleOrder[nextCursor],
        shuffleOrder: state.shuffleOrder,
        shuffleCursor: nextCursor,
      }
    }

    const nextOrder = createShuffleOrder(
      queueLength,
      currentIndex,
      random || Math.random
    )
    const nextCursor = nextOrder.length - 1

    return {
      index: nextOrder[nextCursor],
      shuffleOrder: nextOrder,
      shuffleCursor: nextCursor,
    }
  }

  if (state.shuffleCursor + 1 < state.shuffleOrder.length) {
    const nextCursor = state.shuffleCursor + 1

    return {
      index: state.shuffleOrder[nextCursor],
      shuffleOrder: state.shuffleOrder,
      shuffleCursor: nextCursor,
    }
  }

  const nextOrder = createShuffleOrder(
    queueLength,
    currentIndex,
    random || Math.random
  )
  const nextCursor = Math.min(1, nextOrder.length - 1)

  return {
    index: nextOrder[nextCursor],
    shuffleOrder: nextOrder,
    shuffleCursor: nextCursor,
  }
}

export function resolvePlaybackQueueStep({
  queueLength,
  currentIndex,
  playbackMode,
  direction,
  reason = 'manual',
  shuffleOrder = [],
  shuffleCursor = 0,
  random = Math.random,
}: ResolvePlaybackQueueStepOptions): PlaybackQueueStepResult {
  if (queueLength <= 0) {
    return {
      index: null,
      shuffleOrder: [],
      shuffleCursor: 0,
    }
  }

  if (playbackMode === 'shuffle') {
    return resolveShuffleQueueStep({
      queueLength,
      currentIndex,
      playbackMode,
      direction,
      reason,
      shuffleOrder,
      shuffleCursor,
      random,
    })
  }

  if (
    playbackMode === 'repeat-one' &&
    direction === 'next' &&
    reason === 'auto'
  ) {
    return {
      index: clampQueueIndex(queueLength, currentIndex),
      shuffleOrder,
      shuffleCursor,
    }
  }

  return {
    index: resolveRepeatQueueIndex(queueLength, currentIndex, direction),
    shuffleOrder,
    shuffleCursor,
  }
}

export function getPlaybackQueueItemState(
  itemIndex: number,
  currentIndex: number,
  status: PlaybackStatus
) {
  const isActive = itemIndex === currentIndex

  return {
    isActive,
    isPlaying: isActive && (status === 'playing' || status === 'loading'),
  }
}
