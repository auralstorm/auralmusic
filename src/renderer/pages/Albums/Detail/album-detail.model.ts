import type { AlbumListItem } from '../types'
import type {
  AlbumDetailHeroData,
  AlbumDetailPageState,
  AlbumTrackItem,
  NormalizeAlbumTracksOptions,
  RawAlbumArtist,
  RawAlbumDetailResponse,
  RawAlbumTracksResponse,
} from './types'

export const EMPTY_ALBUM_DETAIL_STATE: AlbumDetailPageState = {
  hero: null,
  tracks: [],
}

function normalizeArtistNames(
  artists?: RawAlbumArtist[],
  artist?: RawAlbumArtist
) {
  return (
    artists
      ?.map(item => item.name || '未知歌手')
      .filter(Boolean)
      .join(' / ') ||
    artist?.name ||
    '未知歌手'
  )
}

export function normalizeAlbumDetailHero(
  payload: RawAlbumDetailResponse | null | undefined
): AlbumDetailHeroData | null {
  const album = payload?.album

  if (!album?.id) {
    return null
  }

  return {
    id: album.id,
    name: album.name || '未知专辑',
    coverUrl: album.picUrl || '',
    artistNames: normalizeArtistNames(album.artists, album.artist),
    publishTime: album.publishTime,
    trackCount: album.size || 0,
    description: album.description || '',
  }
}

export function normalizeAlbumTracks(
  payload: RawAlbumTracksResponse | null | undefined,
  options: NormalizeAlbumTracksOptions = {}
): AlbumTrackItem[] {
  const fallbackCoverUrl =
    options.fallbackCoverUrl || payload?.album?.picUrl || ''

  return (payload?.songs || []).map(track => {
    const artists = (track.ar || [])
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
    const artistNames =
      artists.map(artist => artist.name).join(' / ') || '未知歌手'

    return {
      id: track.id,
      name: track.name || '未知歌曲',
      artistNames,
      artists: artists.length ? artists : undefined,
      albumName: track.al?.name || '未知专辑',
      duration: track.dt || 0,
      coverUrl: track.al?.picUrl || fallbackCoverUrl,
      fee: typeof track.fee === 'number' ? track.fee : 0,
    }
  })
}

export function formatAlbumPublishDate(timestamp?: number) {
  if (!timestamp) return '暂无日期'

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '暂无日期'

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

export function formatAlbumTrackDuration(duration: number) {
  const totalSeconds = Math.max(0, Math.floor(duration / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function toAlbumListItem(hero: AlbumDetailHeroData): AlbumListItem {
  const artistNames = hero.artistNames
    .split('/')
    .map(name => name.trim())
    .filter(Boolean)

  const artists = artistNames.map(name => ({ name }))

  return {
    id: hero.id,
    name: hero.name,
    picUrl: hero.coverUrl,
    blurPicUrl: hero.coverUrl,
    artists: artists.length ? artists : undefined,
    artist: artists[0],
  }
}
