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

const playbackQueueCache = new Map<string, PlaybackTrack[]>()
const playbackQueueInflightTasks = new Map<string, Promise<PlaybackTrack[]>>()

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

function shouldContinueQueueHydration(sourceKey: string) {
  const state = usePlaybackStore.getState()

  return Boolean(sourceKey) && state.queueSourceKey === sourceKey
}

export function getCachedQueueSource(sourceKey: string | null | undefined) {
  if (!sourceKey) {
    return null
  }

  return playbackQueueCache.get(sourceKey) ?? null
}

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
    usePlaybackStore.getState().syncQueueFromSource(params.sourceKey, nextQueue)

    if (pageQueue.length < PLAYLIST_QUEUE_HYDRATE_LIMIT) {
      completed = true
      break
    }
  }

  if (completed && nextQueue.length) {
    playbackQueueCache.set(params.sourceKey, nextQueue)
  }

  return nextQueue
}

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

  usePlaybackStore.getState().syncQueueFromSource(params.sourceKey, fullQueue)

  if (fullQueue.length) {
    playbackQueueCache.set(params.sourceKey, fullQueue)
  }

  return fullQueue
}

async function hydrateCloudQueue(params: {
  sourceKey: string
  seedQueue?: PlaybackTrack[]
  startOffset?: number
}) {
  let nextQueue = appendUniquePlaybackTracks([], params.seedQueue || [])
  const startOffset = params.startOffset ?? 0

  for (let offset = startOffset; ; offset += CLOUD_QUEUE_HYDRATE_LIMIT) {
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
      playbackQueueCache.set(params.sourceKey, nextQueue)
      break
    }
  }

  return nextQueue
}
