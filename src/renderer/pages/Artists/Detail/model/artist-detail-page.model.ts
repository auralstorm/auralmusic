import type {
  ArtistAlbumItem,
  ArtistDescPayload,
  ArtistDetailProfile,
  ArtistDetailResponse,
  ArtistMvItem,
  ArtistTopSongItem,
} from '../../types'
import type { PlaybackTrack } from '../../../../../shared/playback.ts'
import type {
  RawArtistAlbum,
  RawArtistDescResponse,
  RawArtistDetailPayload,
  RawArtistSongsPayload,
  RawArtistMv,
  RawTopSong,
} from '../types'

export function unwrapArtistDetailPayload<T>(
  response: ArtistDetailResponse<T> | null | undefined
): T | null {
  if (!response?.data) {
    return null
  }

  if (
    typeof response.data === 'object' &&
    response.data !== null &&
    'data' in response.data
  ) {
    return (response.data as { data?: T }).data ?? null
  }

  return response.data as T
}

export function normalizeArtistProfile(
  response: ArtistDetailResponse<RawArtistDetailPayload>
): ArtistDetailProfile | null {
  const payload = unwrapArtistDetailPayload(response) || {}
  const artist = payload.artist || {}

  if (!artist.id) {
    return null
  }

  return {
    id: artist.id,
    name: artist.name || '未知歌手',
    coverUrl:
      artist.cover || artist.avatar || artist.picUrl || artist.img1v1Url || '',
    musicSize: artist.musicSize || 0,
    albumSize: artist.albumSize || 0,
    mvSize: artist.mvSize || 0,
    identity:
      payload.identify?.imageDesc ||
      payload.identify?.identityName ||
      artist.identifyTag?.[0] ||
      '音乐人',
  }
}

export function normalizeArtistTopSongs(
  response: ArtistDetailResponse<{ songs?: RawTopSong[] }>
): ArtistTopSongItem[] {
  return normalizeArtistSongs(response)
}

function mapArtistSong(song: RawTopSong): ArtistTopSongItem {
  return {
    id: song.id,
    name: song.name || '未知歌曲',
    subtitle: song.alia?.[0] || song.tns?.[0] || '',
    duration: song.dt || 0,
    albumName: song.al?.name || song.album?.name || '',
    coverUrl: song.al?.picUrl || song.album?.picUrl || '',
    fee: typeof song.fee === 'number' ? song.fee : 0,
    artists: (song.ar || []).map(artist => ({
      id: artist.id,
      name: artist.name || '未知歌手',
    })),
  }
}

export function normalizeArtistSongs(
  response: ArtistDetailResponse<RawArtistSongsPayload>
): ArtistTopSongItem[] {
  const payload = unwrapArtistDetailPayload(response)
  return (payload?.songs || []).map(mapArtistSong)
}

export function createArtistTopSongPlaybackQueue(
  songs: ArtistTopSongItem[]
): PlaybackTrack[] {
  return songs.map(song => ({
    id: song.id,
    name: song.name,
    artistNames: (song.artists || []).map(artist => artist.name).join(' / '),
    albumName: song.albumName,
    coverUrl: song.coverUrl,
    duration: song.duration,
    fee: typeof song.fee === 'number' ? song.fee : 0,
  }))
}

export function normalizeArtistAlbums(
  response: ArtistDetailResponse<{
    hotAlbums?: RawArtistAlbum[]
    albums?: RawArtistAlbum[]
  }>
): ArtistAlbumItem[] {
  const payload = unwrapArtistDetailPayload(response)
  return (payload?.hotAlbums || payload?.albums || []).map(album => ({
    id: album.id,
    name: album.name || '未知专辑',
    picUrl: album.picUrl || album.blurPicUrl || '',
    publishTime: album.publishTime,
    size: album.size,
  }))
}

export function normalizeArtistMvs(
  response: ArtistDetailResponse<{ mvs?: RawArtistMv[] }>
): ArtistMvItem[] {
  const payload = unwrapArtistDetailPayload(response)
  return (payload?.mvs || []).map(mv => ({
    id: mv.id || mv.vid || 0,
    name: mv.name || '未知 MV',
    coverUrl: mv.imgurl16v9 || mv.cover || '',
    publishTime: mv.publishTime,
    playCount: mv.playCount,
  }))
}

export function normalizeArtistDescription(
  response: ArtistDetailResponse<RawArtistDescResponse>
): ArtistDescPayload {
  const payload = unwrapArtistDetailPayload(response) || {}
  const briefDesc = (payload.briefDesc || '').trim()
  const sections = (payload.introduction || [])
    .map(item => ({
      title: item.ti || '',
      content: (item.txt || '').trim(),
    }))
    .filter(section => Boolean(section.content))

  const summary =
    briefDesc || sections.map(section => section.content).join('\n\n')

  return {
    summary,
    sections,
  }
}

export function getArtistHeroSummary(description: ArtistDescPayload) {
  const source = description.summary || description.sections[0]?.content || ''
  if (!source) {
    return ''
  }

  return source
  // return source.length > 180 ? `${source.slice(0, 180)}...` : source
}
