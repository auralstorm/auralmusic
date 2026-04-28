import request from '@/lib/request'
import type {
  NewAlbumParams,
  SubscribedAlbumListParams,
  ToggleAlbumSubscriptionParams,
} from '@/types/api'

/** 获取最新专辑集合，首页新碟区域使用。 */
export function getAlbumNewSet() {
  return request.get('/album/newest')
}

/**
 * 获取专辑详情和曲目
 * @param id 专辑 id
 */
export function getAlbumDetail(id: number | string) {
  return request.get('/album', {
    params: { id },
  })
}

/** 获取用户收藏的专辑列表，需要登录态。 */
export function getSubscribedAlbums(params: SubscribedAlbumListParams) {
  return request.get('/album/sublist', {
    params,
  })
}

/** 获取新碟上架列表，支持地区、分页等参数。 */
export function getNewAlbums(params: NewAlbumParams) {
  return request.get('/album/new', {
    params,
  })
}

/** 收藏或取消收藏专辑。 */
export function toggleAlbumSubscription(params: ToggleAlbumSubscriptionParams) {
  return request.get('/album/sub', {
    params,
  })
}

// 语义别名：页面里“关注专辑/收藏专辑”都映射到同一个接口。
export const followAlbum = toggleAlbumSubscription
