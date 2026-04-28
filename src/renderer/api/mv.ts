import request from '@/lib/request'
import type {
  MvDetailParams,
  MvPlaybackParams,
  SimilarMvParams,
  SubscribedMvListParams,
  TopMvParams,
} from '@/types/api'

/** 获取 MV 详情信息。 */
export function getMvDetail(params: MvDetailParams) {
  return request.get('/mv/detail', {
    params,
  })
}

/** 获取 MV 播放地址。 */
export function getMvPlayback(params: MvPlaybackParams) {
  return request.get('/mv/url', {
    params,
  })
}

/** 获取相似 MV 推荐。 */
export function getSimilarMvs(params: SimilarMvParams) {
  return request.get('/simi/mv', {
    params,
  })
}

/**
 * 获取热门 MV
 *
 * limit/offset 在这里设默认值，让页面不传参时也能获得稳定首屏数据。
 */
export function getTopMvs(params: TopMvParams = {}) {
  return request.get('/top/mv', {
    params: {
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
      area: params.area,
    },
  })
}

/** 获取用户收藏的 MV 列表，需要登录态。 */
export function getSubscribedMvs(params: SubscribedMvListParams) {
  return request.get('/mv/sublist', {
    params,
  })
}
