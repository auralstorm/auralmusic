import request from '@/lib/request'
import type { AudioQualityLevel } from '../../main/config/types'

// 获取排行榜列表
export function getTopList() {
  return request.get('/toplist')
}
// 获取排行榜详情
export function getTopListDetailById(id: string) {
  return request.get(`/playlist/detail?id=${id}`)
}

export function getPlaylistDetail(id: number | string, timestamp?: number) {
  return request.get('/playlist/detail', {
    params: { id, timestamp },
  })
}

export interface CreatePlaylistParams {
  name: string
  privacy?: '10'
  type?: 'NORMAL' | 'VIDEO' | 'SHARED'
}

export function createPlaylist(params: CreatePlaylistParams) {
  return request.get('/playlist/create', {
    params,
  })
}

export interface DeletePlaylistParams {
  id: number | string
  timestamp?: number
}

export function deletePlaylist(params: DeletePlaylistParams) {
  return request.get('/playlist/delete', {
    params,
  })
}

export interface UpdatePlaylistParams {
  id: number | string
  name: string
  desc?: string
  tags?: string
  timestamp?: number
}

export function updatePlaylist(params: UpdatePlaylistParams) {
  return request.get('/playlist/update', {
    params,
  })
}

export interface UpdatePlaylistTracksParams {
  op: 'add' | 'del'
  pid: number | string
  tracks: Array<number | string> | number | string
  timestamp?: number
}

export function updatePlaylistTracks(params: UpdatePlaylistTracksParams) {
  const tracks = Array.isArray(params.tracks)
    ? params.tracks.join(',')
    : params.tracks

  return request.get('/playlist/tracks', {
    params: {
      op: params.op,
      pid: params.pid,
      tracks,
      timestamp: params.timestamp,
    },
  })
}

export interface AddSongToPlaylistParams {
  playlistId: number | string
  trackId: number | string
  isLikedPlaylist?: boolean
  userId?: number | string
  timestamp?: number
}

export function addSongToPlaylist(params: AddSongToPlaylistParams) {
  if (params.isLikedPlaylist) {
    if (!params.userId) {
      throw new Error('liked playlist add requires user id')
    }

    return toggleSongLike({
      id: params.trackId,
      uid: params.userId,
      like: true,
    })
  }

  return updatePlaylistTracks({
    op: 'add',
    pid: params.playlistId,
    tracks: params.trackId,
    timestamp: params.timestamp,
  })
}

// 获取推荐歌单
export function getRecommendPlayList(limit: number = 1) {
  return request.get('/personalized', {
    params: { limit },
  })
}

export interface TopPlaylistParams {
  order?: 'new' | 'hot'
  cat?: string
  limit?: number
  offset?: number
}

/**
 * 歌单 ( 网友精选碟 )
 * 说明 : 调用此接口 , 可获取网友精选碟歌单
 * - order: 可选值为 'new' 和 'hot', 分别对应最新和最热 , 默认为 'hot'
 * - cat: tag, 比如 " 华语 "、" 古风 " 、" 欧美 "、" 流行 ", 默认为 "全部",可从歌单分类接口获取(/playlist/catlist)
 * - limit: 取出歌单数量 , 默认为 50
 * @param {object} params
 * @param {string} params.order
 * @param {string} params.cat
 * @param {number=} params.limit
 */
export function geTopPlayList(params: TopPlaylistParams) {
  return request.get('/top/playlist', {
    params,
  })
}

export interface PlaylistTracksParams {
  id: number | string
  limit?: number
  offset?: number
  timestamp?: number
}

export function getPlaylistTracks(params: PlaylistTracksParams) {
  return request.get('/playlist/track/all', {
    params,
  })
}

export interface PlaylistSubscribeParams {
  id: number | string
  t: 1 | 2
}

export function togglePlaylistSubscription(params: PlaylistSubscribeParams) {
  return request.get('/playlist/subscribe', {
    params,
  })
}
// 获取热门歌单
export function gePlayListCatList() {
  return request.get('/playlist/catlist')
}

export interface PersonalFmParams {
  timestamp?: number
}

// 私人FM
export function getPersonalFm(params?: PersonalFmParams) {
  return request.get('/personal_fm', {
    params,
  })
}

export interface FmTrashParams {
  id: number | string
}

export function fmTrash(params: FmTrashParams) {
  return request.get('/fm_trash', {
    params,
  })
}
//每日推荐
export function getRecommendSongs() {
  return request.get('/recommend/songs')
}

export interface LikeListParams {
  uid: number | string
  timestamp?: number
}

export function getLikeList(params: LikeListParams) {
  return request.get('/likelist', {
    params,
  })
}

export interface ToggleSongLikeParams {
  id: number | string
  uid: number | string
  like: boolean
}

export function toggleSongLike(params: ToggleSongLikeParams) {
  return request.get('/song/like', {
    params,
  })
}

export interface SongUrlV1Params {
  id: number | string
  level: AudioQualityLevel
  unblock: boolean
}

export function getSongUrlV1(params: SongUrlV1Params) {
  return request.get('/song/url/v1', {
    params,
  })
}

export interface LyricParams {
  id: number | string
}

// 按接口文档使用 /lyric/new，返回字段中的 yrc 为逐字歌词。
export function getLyricNew(params: LyricParams) {
  return request.get('/lyric/new', {
    params,
  })
}

export function getSongDetail(ids: Array<number | string> | number | string) {
  const value = Array.isArray(ids) ? ids.join(',') : ids

  return request.get('/song/detail', {
    params: { ids: value },
  })
}

export interface TopArtistsParams {
  limit?: number
  offset?: number
}

/**
 * 热门歌手
 * @param {object} params
 * @param {number} params.limit
 * @param {number} params.offset
 * @returns
 */
export function getTopArtists(params: TopArtistsParams) {
  return request.get('/top/artists', {
    params,
  })
}

// 获取推荐新音乐
export function getPersonalizedNewSong(limit?: number) {
  return request.get('/personalized/newsong', {
    params: {
      limit,
    },
  })
}

/**
 *
 * @param id 歌单 id
 * @param limit
 * @param offset
 * @returns
 */
export function getPlaylistTrackAll(
  id: number,
  limit: number,
  offset: number,
  timestamp?: number
) {
  return request.get('/playlist/track/all', {
    params: {
      id,
      limit,
      offset,
      timestamp,
    },
  })
}

interface PlaylistTrackAllSong {
  id?: number
}

interface PlaylistTrackAllResponse {
  songs?: PlaylistTrackAllSong[]
}

export interface GetPlaylistSongIdsParams {
  id: number
  trackCount?: number
  timestamp?: number
}

export async function getPlaylistSongIds(params: GetPlaylistSongIdsParams) {
  const limit = 1000
  const collectedIds: number[] = []
  const total = Math.max(params.trackCount || 0, 1)

  for (let offset = 0; offset < total; offset += limit) {
    const response = await getPlaylistTrackAll(
      params.id,
      limit,
      offset,
      params.timestamp
    )

    const songs =
      (response.data as PlaylistTrackAllResponse | undefined)?.songs || []
    const ids = songs
      .map(song => song.id)
      .filter((id): id is number => Number.isFinite(id))

    collectedIds.push(...ids)

    if (songs.length < limit) {
      break
    }
  }

  return collectedIds
}
