import type { PlaybackTrack } from '../../../../../shared/playback.ts'

export interface PlaylistPlaybackTracksRequest {
  id: number
  limit: number
  offset: number
  timestamp: number
}

interface RawPlaylistPlaybackArtist {
  name?: string
}

interface RawPlaylistPlaybackAlbum {
  name?: string
  picUrl?: string
}

interface RawPlaylistPlaybackSong {
  id?: number
  name?: string
  dt?: number
  al?: RawPlaylistPlaybackAlbum
  ar?: RawPlaylistPlaybackArtist[]
}

interface RawPlaylistPlaybackTracksResponse {
  songs?: RawPlaylistPlaybackSong[]
}

export function buildPlaylistPlaybackTracksRequest(
  playlistId: number,
  timestamp = Date.now()
): PlaylistPlaybackTracksRequest {
  return {
    id: playlistId,
    limit: 1000,
    offset: 0,
    timestamp,
  }
}

export function normalizePlaylistPlaybackQueue(
  payload: RawPlaylistPlaybackTracksResponse | null | undefined
): PlaybackTrack[] {
  return (payload?.songs || [])
    .filter((song): song is RawPlaylistPlaybackSong & { id: number } =>
      Number.isFinite(song.id)
    )
    .map(song => ({
      id: song.id,
      name: song.name || '未知歌曲',
      artistNames:
        (song.ar || [])
          .map(artist => artist.name || '未知歌手')
          .filter(Boolean)
          .join(' / ') || '未知歌手',
      albumName: song.al?.name || '未知专辑',
      coverUrl: song.al?.picUrl || '',
      duration: song.dt || 0,
    }))
}
