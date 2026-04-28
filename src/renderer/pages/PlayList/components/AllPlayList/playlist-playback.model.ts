import type { PlaybackTrack } from '../../../../../shared/playback.ts'
import type {
  PlaylistPlaybackTracksRequest,
  RawPlaylistPlaybackSong,
  RawPlaylistPlaybackTracksResponse,
} from '../../types'

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
      fee: typeof song.fee === 'number' ? song.fee : 0,
    }))
}
