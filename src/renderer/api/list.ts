import request from '@/lib/request'

// 获取排行榜列表
export function getTopList() {
  return request.get('/toplist')
}
// 获取排行榜详情
export function getTopListDetailById(id: string) {
  return request.get(`/playlist/detail?id=${id}`)
}

export function getPlaylistDetail(id: number | string) {
  return request.get('/playlist/detail', {
    params: { id },
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
}

export function getPlaylistTracks(params: PlaylistTracksParams) {
  return request.get('/playlist/track/all', {
    params,
  })
}
// 获取热门歌单
export function gePlayListCatList() {
  return request.get('/playlist/catlist')
}

// 私人FM
export function getPersonalFm() {
  return request.get('/personal_fm')
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
