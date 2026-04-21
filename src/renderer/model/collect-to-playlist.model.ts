import type {
  CollectPlaylistTarget,
  RawPlaylistItem,
  RawResponse,
} from '@/types/core'

function unwrapData<T>(response?: RawResponse<T> | null): T | undefined {
  if (!response) {
    return undefined
  }

  if (response.data && typeof response.data === 'object') {
    return unwrapData(response.data as RawResponse<T>)
  }

  return response as T
}

export function normalizeCollectPlaylistTargets(
  response: unknown,
  currentUserId?: number | null
): CollectPlaylistTarget[] {
  const body = unwrapData(response as RawResponse<unknown>)

  if (!body || typeof body !== 'object') {
    return []
  }

  const playlists = (body as { playlist?: RawPlaylistItem[] }).playlist

  if (!Array.isArray(playlists)) {
    return []
  }

  return playlists.flatMap(playlist => {
    if (!playlist?.id) {
      return []
    }

    const isLikedPlaylist =
      playlist.specialType === 5 && playlist.creator?.userId === currentUserId
    const isCreatedPlaylist =
      playlist.subscribed !== true && playlist.specialType !== 5

    if (!isLikedPlaylist && !isCreatedPlaylist) {
      return []
    }

    return [
      {
        id: playlist.id,
        name: playlist.name?.trim() || '未知歌单',
        coverImgUrl: playlist.coverImgUrl || playlist.picUrl || '',
        trackCount: playlist.trackCount || 0,
        specialType: playlist.specialType || 0,
        editable: isLikedPlaylist || isCreatedPlaylist,
        isLikedPlaylist,
      },
    ]
  })
}

export function insertCollectPlaylistTarget(
  current: CollectPlaylistTarget[],
  next: CollectPlaylistTarget
): CollectPlaylistTarget[] {
  return [next, ...current.filter(item => item.id !== next.id)]
}

export function findCreatedCollectPlaylistTarget(
  previous: CollectPlaylistTarget[],
  next: CollectPlaylistTarget[],
  createdName: string
): CollectPlaylistTarget | null {
  const normalizedName = createdName.trim()
  const previousIds = new Set(previous.map(item => item.id))

  const insertedMatch =
    next.find(
      item => !previousIds.has(item.id) && item.name.trim() === normalizedName
    ) || null

  if (insertedMatch) {
    return insertedMatch
  }

  return next.find(item => item.name.trim() === normalizedName) || null
}

export function isSongInPlaylistTrackIds(
  songId: number,
  trackIds: number[]
): boolean {
  return trackIds.includes(songId)
}
