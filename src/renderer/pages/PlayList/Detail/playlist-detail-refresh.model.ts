import type { PlaylistDetailLoadRequest } from './types'

const DEFAULT_PLAYLIST_DETAIL_TRACK_LIMIT = 30

export function buildPlaylistDetailLoadRequest(
  playlistId: number,
  bustCache = false,
  timestamp = Date.now()
): PlaylistDetailLoadRequest {
  const cacheTimestamp = bustCache ? timestamp : undefined

  return {
    detail: {
      id: playlistId,
      timestamp: cacheTimestamp,
    },
    tracks: {
      id: playlistId,
      limit: DEFAULT_PLAYLIST_DETAIL_TRACK_LIMIT,
      offset: 0,
      timestamp: cacheTimestamp,
    },
  }
}

export function buildPlaylistTrackPageRequest(params: {
  playlistId: number
  offset: number
  limit?: number
  timestamp?: number
}) {
  return {
    id: params.playlistId,
    limit: params.limit ?? DEFAULT_PLAYLIST_DETAIL_TRACK_LIMIT,
    offset: params.offset,
    timestamp: params.timestamp,
  }
}
