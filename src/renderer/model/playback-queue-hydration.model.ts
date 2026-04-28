import { getAlbumDetail } from '@/api/album'
import { getUserCloud } from '@/api/cloud'
import { getPlaylistTrackAll } from '@/api/list'
import { normalizeAlbumTracks } from '@/pages/Albums/Detail/album-detail.model'
import { normalizeLibraryCloudPage } from '@/pages/Library/library-cloud.model'
import { usePlaybackStore } from '@/stores/playback-store'
import {
  resolveQueueSourceDescriptor,
  type PlaybackTrack,
} from '../../shared/playback.ts'
import { normalizePlaylistPlaybackQueue } from '@/pages/PlayList/components/AllPlayList/playlist-playback.model'

const PLAYLIST_QUEUE_HYDRATE_LIMIT = 1000
const CLOUD_QUEUE_HYDRATE_LIMIT = 1000

// 按来源缓存完整播放队列，避免用户在同一歌单/专辑内反复打开队列时重复拉全量数据。
const playbackQueueCache = new Map<string, PlaybackTrack[]>()
// 同一来源只允许一个补全任务在跑，防止列表页和播放队列抽屉同时触发重复分页请求。
const playbackQueueInflightTasks = new Map<string, Promise<PlaybackTrack[]>>()

/**
 * 合并播放队列并按歌曲 id 去重
 * @param queue 已存在的播放队列
 * @param appendedTracks 待追加的播放歌曲
 * @returns 保留原顺序且去重后的播放队列
 */
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

/**
 * 判断当前补全任务是否仍属于正在播放的队列来源
 *
 * 队列补全通常会跨多个分页请求。用户在补全过程中切到别的歌单/专辑时，
 * 旧任务不应该继续把结果写回播放队列，否则会出现“当前播放来源被旧列表覆盖”的问题。
 */
function shouldContinueQueueHydration(sourceKey: string) {
  const state = usePlaybackStore.getState()

  return Boolean(sourceKey) && state.queueSourceKey === sourceKey
}

/**
 * 读取指定来源的完整队列缓存
 * @param sourceKey 由 shared/playback 生成的队列来源 key
 * @returns 命中时返回完整队列，未命中或 key 为空时返回 null
 */
export function getCachedQueueSource(sourceKey: string | null | undefined) {
  if (!sourceKey) {
    return null
  }

  return playbackQueueCache.get(sourceKey) ?? null
}

/**
 * 确保当前来源的播放队列被补全到尽可能完整
 *
 * 使用场景：
 * - 歌单/云盘页首屏只拿到部分歌曲，但播放队列抽屉需要完整列表。
 * - 当前播放页刷新后，已有 seedQueue 需要和远端完整列表合并。
 *
 * 处理规则：
 * 1. 无法识别来源时直接返回 seedQueue
 * 2. 命中缓存时立即同步到 playback store
 * 3. 同来源已有任务时复用 Promise
 * 4. 新任务结束后移除 inflight 标记
 */
export function ensureQueueSourceHydration(params: {
  sourceKey: string
  seedQueue?: PlaybackTrack[]
  startOffset?: number
}) {
  const descriptor = resolveQueueSourceDescriptor(params.sourceKey)

  if (!descriptor) {
    return Promise.resolve(params.seedQueue || [])
  }

  const cachedQueue = playbackQueueCache.get(params.sourceKey)
  if (cachedQueue) {
    usePlaybackStore
      .getState()
      .syncQueueFromSource(params.sourceKey, cachedQueue)
    return Promise.resolve(cachedQueue)
  }

  const inflightTask = playbackQueueInflightTasks.get(params.sourceKey)
  if (inflightTask) {
    return inflightTask
  }

  const task = createHydrationTask(params, descriptor).finally(() => {
    playbackQueueInflightTasks.delete(params.sourceKey)
  })

  playbackQueueInflightTasks.set(params.sourceKey, task)

  return task
}

function createHydrationTask(
  params: {
    sourceKey: string
    seedQueue?: PlaybackTrack[]
    startOffset?: number
  },
  descriptor: NonNullable<ReturnType<typeof resolveQueueSourceDescriptor>>
) {
  // descriptor.type 是跨页面约定：不同来源的分页接口和归一化模型完全不同。
  switch (descriptor.type) {
    case 'playlist':
    case 'liked-songs':
      return hydratePlaylistLikeQueue({
        sourceId: descriptor.id,
        sourceKey: params.sourceKey,
        seedQueue: params.seedQueue,
        startOffset: params.startOffset,
      })
    case 'album':
      return hydrateAlbumQueue({
        albumId: descriptor.id,
        sourceKey: params.sourceKey,
        seedQueue: params.seedQueue,
      })
    case 'cloud':
      return hydrateCloudQueue({
        sourceKey: params.sourceKey,
        seedQueue: params.seedQueue,
        startOffset: params.startOffset,
      })
    default:
      return Promise.resolve(params.seedQueue || [])
  }
}

/**
 * 补全歌单类播放队列
 *
 * 适用于普通歌单和“我喜欢的音乐”。接口按分页返回歌曲，补全过程中会边拉取
 * 边同步到播放 store，让播放队列抽屉可以逐步变完整，而不是等全量完成。
 */
async function hydratePlaylistLikeQueue(params: {
  sourceId: number
  sourceKey: string
  seedQueue?: PlaybackTrack[]
  startOffset?: number
}) {
  let nextQueue = appendUniquePlaybackTracks([], params.seedQueue || [])
  const timestamp = Date.now()
  let completed = false
  const startOffset = params.startOffset ?? 0

  for (let offset = startOffset; ; offset += PLAYLIST_QUEUE_HYDRATE_LIMIT) {
    // 每一页请求前都校验来源，避免用户切歌单后旧任务继续消耗接口额度。
    if (!shouldContinueQueueHydration(params.sourceKey)) {
      break
    }

    const response = await getPlaylistTrackAll(
      params.sourceId,
      PLAYLIST_QUEUE_HYDRATE_LIMIT,
      offset,
      timestamp
    )

    if (!shouldContinueQueueHydration(params.sourceKey)) {
      break
    }

    const pageQueue = normalizePlaylistPlaybackQueue(response.data)

    if (!pageQueue.length) {
      completed = true
      break
    }

    nextQueue = appendUniquePlaybackTracks(nextQueue, pageQueue)
    // 分页补全时立即同步部分结果，队列 UI 不需要等待所有分页结束。
    usePlaybackStore.getState().syncQueueFromSource(params.sourceKey, nextQueue)

    if (pageQueue.length < PLAYLIST_QUEUE_HYDRATE_LIMIT) {
      completed = true
      break
    }
  }

  if (completed && nextQueue.length) {
    // 只有完整跑到末页才写缓存，避免把中途切换来源的半截队列缓存起来。
    playbackQueueCache.set(params.sourceKey, nextQueue)
  }

  return nextQueue
}

/**
 * 补全专辑播放队列
 *
 * 专辑详情接口一次返回完整曲目，因此没有分页循环。仍然保留 seedQueue 合并，
 * 是为了当前歌曲已经带有后台补全的歌词/封面时，不被接口里的旧元数据覆盖。
 */
async function hydrateAlbumQueue(params: {
  albumId: number
  sourceKey: string
  seedQueue?: PlaybackTrack[]
}) {
  const nextQueue = appendUniquePlaybackTracks([], params.seedQueue || [])

  if (!shouldContinueQueueHydration(params.sourceKey)) {
    return nextQueue
  }

  const response = await getAlbumDetail(params.albumId)

  if (!shouldContinueQueueHydration(params.sourceKey)) {
    return nextQueue
  }

  const fullQueue = appendUniquePlaybackTracks(
    nextQueue,
    normalizeAlbumTracks(response.data)
  )

  // 专辑接口是全量结果，成功后直接同步并缓存。
  usePlaybackStore.getState().syncQueueFromSource(params.sourceKey, fullQueue)

  if (fullQueue.length) {
    playbackQueueCache.set(params.sourceKey, fullQueue)
  }

  return fullQueue
}

/**
 * 补全云盘播放队列
 *
 * 云盘列表同样是分页接口，但返回的是 Library cloud page 结构，需要走
 * `normalizeLibraryCloudPage` 转成 PlaybackTrack 后再合并到当前队列。
 */
async function hydrateCloudQueue(params: {
  sourceKey: string
  seedQueue?: PlaybackTrack[]
  startOffset?: number
}) {
  let nextQueue = appendUniquePlaybackTracks([], params.seedQueue || [])
  const startOffset = params.startOffset ?? 0

  for (let offset = startOffset; ; offset += CLOUD_QUEUE_HYDRATE_LIMIT) {
    // 云盘数据通常较多，来源失效后立即停止分页，减少无意义请求。
    if (!shouldContinueQueueHydration(params.sourceKey)) {
      break
    }

    const response = await getUserCloud({
      limit: CLOUD_QUEUE_HYDRATE_LIMIT,
      offset,
    })

    if (!shouldContinueQueueHydration(params.sourceKey)) {
      break
    }

    const page = normalizeLibraryCloudPage(response.data, {
      limit: CLOUD_QUEUE_HYDRATE_LIMIT,
      offset,
    })

    if (!page.list.length) {
      break
    }

    nextQueue = appendUniquePlaybackTracks(nextQueue, page.list)
    usePlaybackStore.getState().syncQueueFromSource(params.sourceKey, nextQueue)

    if (!page.hasMore || page.list.length < CLOUD_QUEUE_HYDRATE_LIMIT) {
      // 云盘只有明确到达末页时才缓存，避免缓存缺页数据。
      playbackQueueCache.set(params.sourceKey, nextQueue)
      break
    }
  }

  return nextQueue
}
