import request from '@/lib/request'

export interface ArtistListParams {
  area: -1 | 7 | 96 | 8 | 16 | 0
  type: -1 | 1 | 2 | 3
  initial: -1 | 0 | string
  offset?: number
  limit?: number
}

export interface SubscribedArtistListParams {
  limit?: number
  offset?: number
}

export function getArtistList(params: ArtistListParams) {
  return request.get('/artist/list', {
    params,
  })
}

export function getSubscribedArtists(params: SubscribedArtistListParams) {
  return request.get('/artist/sublist', {
    params,
  })
}

export interface ArtistDetailParams {
  id: number | string
}

export interface ArtistListPageParams extends ArtistDetailParams {
  limit?: number
  offset?: number
}

export function getArtistDetail(params: ArtistDetailParams) {
  return request.get('/artist/detail', {
    params,
  })
}

export function getArtistTopSongs(params: ArtistDetailParams) {
  return request.get('/artist/top/song', {
    params,
  })
}

export function getArtistAlbums(params: ArtistListPageParams) {
  return request.get('/artist/album', {
    params,
  })
}

export function getArtistMvs(params: ArtistListPageParams) {
  return request.get('/artist/mv', {
    params,
  })
}

export function getSimilarArtists(params: ArtistDetailParams) {
  return request.get('/simi/artist', {
    params,
  })
}

export function getArtistDesc(params: ArtistDetailParams) {
  return request.get('/artist/desc', {
    params,
  })
}

/**
 * 收藏歌手
 * 说明 : 调用此接口 , 传入歌手 id, 可收藏歌手
 * - id: 歌手 id
 * - t: 操作,1 为收藏,其他为取消收藏
 * @param {Object} params
 * @param {number} params.id
 * @param {number} params.t
 */
export function followArtist(params: any) {
  return request.get('/artist/sub', {
    params,
  })
}
