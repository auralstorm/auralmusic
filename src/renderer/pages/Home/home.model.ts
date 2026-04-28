import type { PlaybackTrack } from '../../../shared/playback.ts'
import type {
  HomeDailySong,
  HomeFmSong,
  HomeNewSong,
  RawArtist,
  RawSongLike,
} from './types'

function joinArtistNames(artists?: RawArtist[]) {
  return (artists || [])
    .map(artist => artist.name?.trim())
    .filter((name): name is string => Boolean(name))
    .join(' / ')
}

function resolveArtistNames(song: RawSongLike) {
  const names = joinArtistNames(song.artists || song.ar)

  if (names) {
    return names
  }

  return (
    song.artist?.name ||
    song.album?.artist?.name ||
    song.al?.artist?.name ||
    '未知歌手'
  )
}

function normalizeSongLikeTrack(
  song: RawSongLike,
  fallbackAlbumName = '未知专辑'
): PlaybackTrack | null {
  const id = song.id || 0
  const name = song.name?.trim() || ''

  if (!id || !name) {
    return null
  }

  const album = song.album || song.al

  return {
    id,
    name,
    artistNames: resolveArtistNames(song),
    albumName: album?.name || fallbackAlbumName,
    coverUrl: song.picUrl || album?.picUrl || '',
    duration: song.duration || song.dt || 0,
    fee: typeof song.fee === 'number' ? song.fee : 0,
  }
}

function resolveNewSongArtistNames(item: HomeNewSong) {
  const song = item.song || {}
  const names = joinArtistNames(song.artists || song.ar)

  if (names) {
    return names
  }

  return item.artist?.name || resolveArtistNames(song)
}

export function normalizeHomeFmTrack(song: HomeFmSong): PlaybackTrack | null {
  return normalizeSongLikeTrack(song, '私人 FM')
}

export function normalizeHomeDailyTracks(
  songs: HomeDailySong[]
): PlaybackTrack[] {
  return songs
    .map(song => normalizeSongLikeTrack(song, '每日推荐'))
    .filter((track): track is PlaybackTrack => Boolean(track))
}

export function normalizeHomeNewSongTracks(
  songs: HomeNewSong[]
): PlaybackTrack[] {
  return songs
    .map(item => {
      const song = item.song || {}
      const track = normalizeSongLikeTrack(
        {
          ...song,
          id: item.id || song.id,
          name: item.name || song.name,
          artist: item.artist || song.artist,
          picUrl: item.picUrl || song.picUrl,
        },
        '新歌速递'
      )

      if (!track) {
        return null
      }

      return {
        ...track,
        artistNames: resolveNewSongArtistNames(item),
      }
    })
    .filter((track): track is PlaybackTrack => Boolean(track))
}
