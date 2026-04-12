import type { AlbumListItem } from '../albums.model'

export interface AlbumDetailHeroData {
  id: number
  name: string
  coverUrl: string
  artistNames: string
  publishTime?: number
  trackCount: number
  description: string
}

export interface AlbumTrackItem {
  id: number
  name: string
  artistNames: string
  albumName: string
  duration: number
  coverUrl: string
}

export interface AlbumDetailPageState {
  hero: AlbumDetailHeroData | null
  tracks: AlbumTrackItem[]
}

interface RawAlbumArtist {
  name?: string
}

interface RawAlbumDetail {
  id?: number
  name?: string
  picUrl?: string
  publishTime?: number
  description?: string
  size?: number
  artists?: RawAlbumArtist[]
  artist?: RawAlbumArtist
}

interface RawAlbumDetailResponse {
  album?: RawAlbumDetail
}

interface RawTrackArtist {
  name?: string
}

interface RawTrackAlbum {
  name?: string
  picUrl?: string
}

interface RawAlbumTrack {
  id: number
  name?: string
  dt?: number
  al?: RawTrackAlbum
  ar?: RawTrackArtist[]
}

interface RawAlbumTracksResponse extends RawAlbumDetailResponse {
  songs?: RawAlbumTrack[]
}

interface NormalizeAlbumTracksOptions {
  fallbackCoverUrl?: string
}

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

  return (payload?.songs || []).map(track => ({
    id: track.id,
    name: track.name || '未知歌曲',
    artistNames:
      (track.ar || [])
        .map(artist => artist.name || '未知歌手')
        .filter(Boolean)
        .join(' / ') || '未知歌手',
    albumName: track.al?.name || '未知专辑',
    duration: track.dt || 0,
    coverUrl: track.al?.picUrl || fallbackCoverUrl,
  }))
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
