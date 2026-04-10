export interface ArtistDetailProfile {
  id: number
  name: string
  coverUrl: string
  musicSize: number
  albumSize: number
  mvSize: number
  identity: string
}

export interface ArtistSongArtist {
  id?: number
  name: string
}

export interface ArtistTopSongItem {
  id: number
  name: string
  subtitle: string
  duration: number
  albumName: string
  coverUrl: string
  artists: ArtistSongArtist[]
}

export interface ArtistAlbumItem {
  id: number
  name: string
  picUrl: string
  publishTime?: number
  size?: number
}

export interface ArtistMvItem {
  id: number
  name: string
  coverUrl: string
  publishTime?: string
  playCount?: number
}

export interface ArtistSimilarItem {
  id: number
  name: string
  picUrl: string
}

export interface ArtistDescSection {
  title: string
  content: string
}

export interface ArtistDescPayload {
  summary: string
  sections: ArtistDescSection[]
}

export interface ArtistLatestReleaseData {
  album: ArtistAlbumItem | null
  mv: ArtistMvItem | null
}

export interface ArtistDetailPageState {
  profile: ArtistDetailProfile | null
  topSongs: ArtistTopSongItem[]
  description: ArtistDescPayload
  similarArtists: ArtistSimilarItem[]
}

export interface ArtistDetailResponse<T> {
  data?: T | { data?: T }
}

interface RawSimilarArtist {
  id?: number
  name?: string
  picUrl?: string
  img1v1Url?: string
}

interface RawSimilarArtistsBody {
  artists?: RawSimilarArtist[]
  data?: RawSimilarArtistsBody
}

function unwrapSimilarArtistsBody(
  response?: RawSimilarArtistsBody | null
): RawSimilarArtistsBody {
  if (!response) {
    return {}
  }

  if (
    Array.isArray(response.artists) ||
    !response.data ||
    typeof response.data !== 'object'
  ) {
    return response
  }

  return unwrapSimilarArtistsBody(response.data)
}

export function normalizeSimilarArtists(
  response?: RawSimilarArtistsBody | null
): ArtistSimilarItem[] {
  const payload = unwrapSimilarArtistsBody(response)

  return (payload?.artists || [])
    .map(artist => ({
      id: artist.id || 0,
      name: artist.name || '未知歌手',
      picUrl: artist.picUrl || artist.img1v1Url || '',
    }))
    .filter(artist => artist.id > 0)
}

export function formatArtistDuration(duration: number) {
  const totalSeconds = Math.max(0, Math.floor(duration / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatArtistPublishDate(timestamp?: number | string) {
  if (!timestamp) return '暂无日期'

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '暂无日期'

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

export const EMPTY_ARTIST_DESCRIPTION: ArtistDescPayload = {
  summary: '',
  sections: [],
}

export function toArtistListItem(profile: ArtistDetailProfile) {
  return {
    id: profile.id,
    name: profile.name,
    picUrl: profile.coverUrl,
    albumSize: profile.albumSize,
    musicSize: profile.musicSize,
  }
}
