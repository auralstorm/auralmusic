export interface PlaylistDetailLoadRequest {
  detail: {
    id: number
    timestamp?: number
  }
  tracks: {
    id: number
    limit: number
    offset: number
    timestamp?: number
  }
}

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
      limit: 1000,
      offset: 0,
      timestamp: cacheTimestamp,
    },
  }
}
