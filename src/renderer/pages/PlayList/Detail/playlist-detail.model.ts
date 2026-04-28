import type {
  PlaylistDetailHeroData,
  PlaylistDetailPageState,
  PlaylistTrackItem,
  RawPlaylistDetailResponse,
  RawPlaylistTracksResponse,
} from './types'

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
    isSubscribed: playlist.subscribed === true,
  }
}

export function normalizePlaylistTracks(
  payload: RawPlaylistTracksResponse | null | undefined
): PlaylistTrackItem[] {
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
      coverUrl: track.al?.picUrl || '',
      fee: typeof track.fee === 'number' ? track.fee : 0,
    }
  })
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
