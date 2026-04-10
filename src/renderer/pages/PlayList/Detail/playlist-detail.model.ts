export interface PlaylistDetailHeroData {
  id: number
  name: string
  coverUrl: string
  creatorName: string
  creatorUserId: number | null
  description: string
  updateTime?: number
  trackCount: number
}

export interface PlaylistTrackItem {
  id: number
  name: string
  artistNames: string
  albumName: string
  duration: number
  coverUrl: string
}

export interface PlaylistDetailPageState {
  hero: PlaylistDetailHeroData | null
  tracks: PlaylistTrackItem[]
}

interface RawPlaylistCreator {
  nickname?: string
  userId?: number
}

interface RawPlaylistDetail {
  id?: number
  name?: string
  coverImgUrl?: string
  description?: string
  updateTime?: number
  trackCount?: number
  creator?: RawPlaylistCreator
}

interface RawPlaylistDetailResponse {
  playlist?: RawPlaylistDetail
}

interface RawTrackArtist {
  name?: string
}

interface RawTrackAlbum {
  name?: string
  picUrl?: string
}

interface RawPlaylistTrack {
  id: number
  name?: string
  dt?: number
  al?: RawTrackAlbum
  ar?: RawTrackArtist[]
}

interface RawPlaylistTracksResponse {
  songs?: RawPlaylistTrack[]
}

export const EMPTY_PLAYLIST_DETAIL_STATE: PlaylistDetailPageState = {
  hero: null,
  tracks: [],
}

export function normalizePlaylistDetailHero(
  payload: RawPlaylistDetailResponse | null | undefined
): PlaylistDetailHeroData | null {
  const playlist = payload?.playlist

  if (!playlist?.id) {
    return null
  }

  return {
    id: playlist.id,
    name: playlist.name || '未知歌单',
    coverUrl: playlist.coverImgUrl || '',
    creatorName: playlist.creator?.nickname || '未知用户',
    creatorUserId: playlist.creator?.userId ?? null,
    description: playlist.description || '',
    updateTime: playlist.updateTime,
    trackCount: playlist.trackCount || 0,
  }
}

export function normalizePlaylistTracks(
  payload: RawPlaylistTracksResponse | null | undefined
): PlaylistTrackItem[] {
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
    coverUrl: track.al?.picUrl || '',
  }))
}

export function formatPlaylistUpdateDate(timestamp?: number) {
  if (!timestamp) return '暂无更新'

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '暂无更新'

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

export function formatTrackDuration(duration: number) {
  const totalSeconds = Math.max(0, Math.floor(duration / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
