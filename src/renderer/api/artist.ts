import request from '@/lib/request'
import type {
  ArtistDetailParams,
  ArtistListPageParams,
  ArtistListParams,
  ArtistSongsParams,
  SubscribedArtistListParams,
  ToggleArtistSubscriptionParams,
} from '@/types/api'

/** 获取歌手列表，支持分类、地区、首字母和分页。 */
export function getArtistList(params: ArtistListParams) {
  return request.get('/artist/list', {
    params,
  })
}

/** 获取当前用户收藏/关注的歌手列表，需要登录态。 */
export function getSubscribedArtists(params: SubscribedArtistListParams) {
  return request.get('/artist/sublist', {
    params,
  })
}

/** 获取歌手详情基础信息。 */
export function getArtistDetail(params: ArtistDetailParams) {
  return request.get('/artist/detail', {
    params,
  })
}

/** 获取歌手热门歌曲，用于歌手详情首屏。 */
export function getArtistTopSongs(params: ArtistDetailParams) {
  return request.get('/artist/top/song', {
    params,
  })
}

/** 分页获取歌手全部歌曲。 */
export function getArtistSongs(params: ArtistSongsParams) {
  return request.get('/artist/songs', {
    params,
  })
}

/** 分页获取歌手专辑。 */
export function getArtistAlbums(params: ArtistListPageParams) {
  return request.get('/artist/album', {
    params,
  })
}

/** 分页获取歌手 MV。 */
export function getArtistMvs(params: ArtistListPageParams) {
  return request.get('/artist/mv', {
    params,
  })
}

/** 获取相似歌手推荐。 */
export function getSimilarArtists(params: ArtistDetailParams) {
  return request.get('/simi/artist', {
    params,
  })
}

/** 获取歌手简介、经历和扩展描述。 */
export function getArtistDesc(params: ArtistDetailParams) {
  return request.get('/artist/desc', {
    params,
  })
}

/** 关注或取消关注歌手。 */
export function followArtist(params: ToggleArtistSubscriptionParams) {
  return request.get('/artist/sub', {
    params,
  })
}
