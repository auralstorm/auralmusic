import { LX_SOURCE_KEYS } from './lx-music-source.ts'
import type { LxMusicInfo, LxQuality, LxSourceKey } from './lx-music-source.ts'

/** 播放器状态枚举，store、托盘和 UI 控件共用。 */
export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

/** 播放模式切换顺序，按钮点击按该顺序轮换。 */
export const PLAYBACK_MODE_SEQUENCE = [
  'repeat-all',
  'shuffle',
  'repeat-one',
] as const

export type PlaybackMode = (typeof PLAYBACK_MODE_SEQUENCE)[number]

/** 队列推进原因：手动切歌和自动播完在单曲循环下行为不同。 */
export type PlaybackAdvanceReason = 'manual' | 'auto'

/** 队列推进方向。 */
export type PlaybackAdvanceDirection = 'next' | 'previous'

/** 播放队列中的标准曲目模型。 */
export type PlaybackTrack = {
  id: number
  name: string
  artistNames: string
  albumName: string
  coverUrl: string
  duration: number
  fee?: number
  sourceUrl?: string
  lyricText?: string
  translatedLyricText?: string
  lockedPlatform?: LxSourceKey
  lockedLxSourceId?: string
  preferredQuality?: LxQuality
  lxInfo?: Partial<
    Pick<
      LxMusicInfo,
      | 'songmid'
      | 'songId'
      | 'audioId'
      | 'hash'
      | 'strMediaMid'
      | 'copyrightId'
      | 'albumId'
      | 'source'
      | 'img'
    >
  >
}

const PLAYLIST_QUEUE_SOURCE_PREFIX = 'playlist:'
const LIKED_SONGS_QUEUE_SOURCE_PREFIX = 'liked-songs:'
const ALBUM_QUEUE_SOURCE_PREFIX = 'album:'
const CLOUD_QUEUE_SOURCE_PREFIX = 'cloud:'
const VALID_LX_QUALITIES: LxQuality[] = ['128k', '320k', 'flac', 'flac24bit']

/** 播放队列快照，currentIndex 为 -1 表示空队列。 */
export type PlaybackQueueSnapshot = {
  queue: PlaybackTrack[]
  currentIndex: number
  currentTrack: PlaybackTrack | null
}

/** queueSourceKey 解析后的来源描述，用于恢复当前队列上下文。 */
export type PlaybackQueueSourceDescriptor = {
  type: 'playlist' | 'liked-songs' | 'album' | 'cloud'
  id: number
}

/** /song/url/v1 标准化后的单曲 URL 结果。 */
export type SongUrlV1Result = {
  id: number
  url: string
  time: number
  br: number
}

/** 队列步进结果，同时携带随机播放顺序和游标。 */
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

/** 兼容 Music API 可能返回 data 或 data.data 两种层级。 */
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

/** 归一化 /song/url/v1 响应，取第一个有 URL 的条目。 */
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

/** 归一化解灰匹配接口响应，缺失 id/time/br 时沿用官方接口结果。 */
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

/** 生成官方 URL 请求尝试序列，开启 unblock 时先官方后解灰。 */
export function createSongUrlRequestAttempts(unblockEnabled: boolean) {
  return unblockEnabled ? [false, true] : [false]
}

/** 归一化播放音量，限制 0-100 的整数。 */
export function normalizePlaybackVolume(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 70
  }

  return Math.min(100, Math.max(0, Math.round(value)))
}

/** 归一化播放模式。 */
export function normalizePlaybackMode(value: unknown): PlaybackMode {
  if (
    typeof value === 'string' &&
    PLAYBACK_MODE_SEQUENCE.includes(value as PlaybackMode)
  ) {
    return value as PlaybackMode
  }

  return 'repeat-all'
}

/** 获取下一个播放模式。 */
export function getNextPlaybackMode(mode: PlaybackMode): PlaybackMode {
  const currentIndex = PLAYBACK_MODE_SEQUENCE.indexOf(mode)
  const nextIndex =
    currentIndex >= 0 ? (currentIndex + 1) % PLAYBACK_MODE_SEQUENCE.length : 0

  return PLAYBACK_MODE_SEQUENCE[nextIndex]
}

/** 归一化外部传入的播放曲目，过滤无 id 或无名称的非法项。 */
export function normalizePlaybackTrack(track: unknown): PlaybackTrack | null {
  if (!isRecord(track)) {
    return null
  }

  const id = typeof track.id === 'number' ? track.id : 0
  const name = typeof track.name === 'string' ? track.name.trim() : ''

  if (!id || !name) {
    return null
  }

  const lockedPlatform =
    typeof track.lockedPlatform === 'string' &&
    LX_SOURCE_KEYS.includes(track.lockedPlatform as LxSourceKey)
      ? (track.lockedPlatform as LxSourceKey)
      : undefined
  const lockedLxSourceId =
    typeof track.lockedLxSourceId === 'string' && track.lockedLxSourceId.trim()
      ? track.lockedLxSourceId.trim()
      : undefined
  const preferredQuality =
    typeof track.preferredQuality === 'string' &&
    VALID_LX_QUALITIES.includes(track.preferredQuality as LxQuality)
      ? (track.preferredQuality as LxQuality)
      : undefined
  const rawLxInfo =
    track.lxInfo && isRecord(track.lxInfo)
      ? (track.lxInfo as Record<string, unknown>)
      : null
  const lxInfo = rawLxInfo
    ? {
        songmid:
          typeof rawLxInfo.songmid === 'string' ||
          typeof rawLxInfo.songmid === 'number'
            ? rawLxInfo.songmid
            : undefined,
        songId:
          typeof rawLxInfo.songId === 'string' ||
          typeof rawLxInfo.songId === 'number'
            ? rawLxInfo.songId
            : undefined,
        audioId:
          typeof rawLxInfo.audioId === 'string' && rawLxInfo.audioId.trim()
            ? rawLxInfo.audioId.trim()
            : undefined,
        hash:
          typeof rawLxInfo.hash === 'string' && rawLxInfo.hash.trim()
            ? rawLxInfo.hash.trim()
            : undefined,
        strMediaMid:
          typeof rawLxInfo.strMediaMid === 'string' &&
          rawLxInfo.strMediaMid.trim()
            ? rawLxInfo.strMediaMid.trim()
            : undefined,
        copyrightId:
          typeof rawLxInfo.copyrightId === 'string' &&
          rawLxInfo.copyrightId.trim()
            ? rawLxInfo.copyrightId.trim()
            : undefined,
        albumId:
          typeof rawLxInfo.albumId === 'string' ||
          typeof rawLxInfo.albumId === 'number'
            ? rawLxInfo.albumId
            : undefined,
        source:
          typeof rawLxInfo.source === 'string' && rawLxInfo.source.trim()
            ? rawLxInfo.source.trim()
            : undefined,
        img:
          typeof rawLxInfo.img === 'string' && rawLxInfo.img.trim()
            ? rawLxInfo.img.trim()
            : undefined,
      }
    : undefined

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
    fee: typeof track.fee === 'number' ? track.fee : 0,
    sourceUrl:
      typeof track.sourceUrl === 'string' && track.sourceUrl.trim()
        ? track.sourceUrl.trim()
        : undefined,
    lyricText:
      typeof track.lyricText === 'string' ? track.lyricText.trim() : undefined,
    translatedLyricText:
      typeof track.translatedLyricText === 'string'
        ? track.translatedLyricText.trim()
        : undefined,
    lockedPlatform,
    lockedLxSourceId,
    preferredQuality,
    lxInfo,
  }
}

/** 创建播放队列快照，并把起始下标夹到合法范围。 */
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

/** 创建歌单队列来源 key。 */
export function createPlaylistQueueSourceKey(playlistId: number | string) {
  return createPrefixedQueueSourceKey(PLAYLIST_QUEUE_SOURCE_PREFIX, playlistId)
}

/** 创建我喜欢队列来源 key。 */
export function createLikedSongsQueueSourceKey(playlistId: number | string) {
  return createPrefixedQueueSourceKey(
    LIKED_SONGS_QUEUE_SOURCE_PREFIX,
    playlistId
  )
}

/** 创建专辑队列来源 key。 */
export function createAlbumQueueSourceKey(albumId: number | string) {
  return createPrefixedQueueSourceKey(ALBUM_QUEUE_SOURCE_PREFIX, albumId)
}

/** 创建云盘队列来源 key。 */
export function createCloudQueueSourceKey(userId: number | string) {
  return createPrefixedQueueSourceKey(CLOUD_QUEUE_SOURCE_PREFIX, userId)
}

/** 创建带类型前缀的队列来源 key，非法 id 保留前缀作为不可解析标记。 */
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

/** 从歌单 queueSourceKey 中解析歌单 id。 */
export function resolvePlaylistIdFromQueueSourceKey(
  sourceKey: string | null | undefined
) {
  return resolvePrefixedQueueSourceId(sourceKey, PLAYLIST_QUEUE_SOURCE_PREFIX)
}

/** 从指定前缀的 queueSourceKey 中解析正整数 id。 */
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

/** 将 queueSourceKey 解析成来源类型和 id。 */
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

/** 获取顺序播放下一首下标，到队尾返回 null。 */
export function getNextQueueIndex(
  queue: PlaybackTrack[],
  currentIndex: number
) {
  const nextIndex = currentIndex + 1

  return nextIndex < queue.length ? nextIndex : null
}

/** 获取顺序播放上一首下标，到队首返回 null。 */
export function getPreviousQueueIndex(
  queue: PlaybackTrack[],
  currentIndex: number
) {
  const previousIndex = currentIndex - 1

  return queue.length > 0 && previousIndex >= 0 ? previousIndex : null
}

/** 将当前下标夹到队列范围内。 */
function clampQueueIndex(queueLength: number, currentIndex: number) {
  if (queueLength <= 0) {
    return -1
  }

  if (!Number.isFinite(currentIndex)) {
    return 0
  }

  return Math.min(queueLength - 1, Math.max(0, currentIndex))
}

/** 读取随机下标，注入 random 便于单元测试固定随机序列。 */
function readRandomIndex(random: () => number, upperBound: number) {
  const value = random()
  const safeValue = Number.isFinite(value) ? value : 0

  return Math.min(
    upperBound - 1,
    Math.max(0, Math.floor(safeValue * upperBound))
  )
}

/** 校验随机播放顺序是否覆盖当前队列全部下标且无重复。 */
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

/** 创建随机播放顺序，当前歌曲固定放第一位，避免切到随机模式时立刻跳歌。 */
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

/** 修复或复用随机播放状态，保证当前歌曲和 cursor 对齐。 */
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

/** repeat-all 下按方向循环推进队列。 */
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

/** 随机模式下按随机顺序和游标推进队列。 */
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

/**
 * 计算下一步播放位置。
 *
 * repeat-one 只有自动播完时停留当前曲，手动下一首仍按列表推进，符合播放器常见交互。
 */
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

/** 计算队列项 UI 状态，loading 也按播放中显示，避免切歌加载时高亮闪烁。 */
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
