import type {
  DailySongRowItem,
  DailySongsPageState,
  RawDailySong,
  RawDailySongArtist,
  RawRecommendSongsResponse,
} from './types'

export const EMPTY_DAILY_SONGS_STATE: DailySongsPageState = {
  songs: [],
}

function unwrapDailySongs(
  response: RawRecommendSongsResponse | null | undefined
): RawDailySong[] {
  if (!response) {
    return []
  }

  if (Array.isArray(response.dailySongs)) {
    return response.dailySongs
  }

  if (Array.isArray(response.data?.dailySongs)) {
    return response.data.dailySongs
  }

  return []
}

function formatArtistNames(artists: RawDailySongArtist[] | undefined) {
  const normalizedArtists = (artists || [])
    .map(artist => {
      const name = artist.name?.trim() || ''
      if (!name) {
        return null
      }

      if (artist.id) {
        return {
          id: artist.id,
          name,
        }
      }

      return {
        name,
      }
    })
    .filter((artist): artist is { id?: number; name: string } =>
      Boolean(artist)
    )

  const joined = normalizedArtists.map(artist => artist.name).join(' / ') || ''

  return {
    artists: normalizedArtists,
    artistNames: joined || '未知歌手',
  }
}

export function normalizeDailySongs(
  response: RawRecommendSongsResponse | null | undefined
): DailySongRowItem[] {
  return unwrapDailySongs(response).flatMap(song => {
    if (!song?.id) {
      return []
    }

    const artistState = formatArtistNames(song.ar)

    return [
      {
        id: song.id,
        name: song.name || '未知歌曲',
        artistNames: artistState.artistNames,
        artists: artistState.artists.length ? artistState.artists : undefined,
        albumName: song.al?.name || '未知专辑',
        coverUrl: song.al?.picUrl || '',
        duration: song.dt || 0,
        fee: typeof song.fee === 'number' ? song.fee : 0,
      },
    ]
  })
}

export function formatDailySongDuration(duration: number) {
  const totalSeconds = Math.max(0, Math.floor(duration / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
