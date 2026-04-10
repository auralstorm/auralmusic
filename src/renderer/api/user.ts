import request from '@/lib/request'

/**
 * 获取用户歌单
 * 说明 : 登录后调用此接口 , 传入用户 id, 可以获取用户歌单
 * - uid : 用户 id
 * - limit : 返回数量 , 默认为 30
 * - offset : 偏移数量，用于分页 , 如 :( 页数 -1)*30, 其中 30 为 limit 的值 , 默认为 0
 * @param {Object} params
 * @param {number} params.uid
 * @param {number} params.limit
 * @param {number=} params.offset
 */
export interface UserPlaylistParams {
  uid: number | string
  limit?: number
  offset?: number
  timestamp?: number
}

export function userPlaylist(params: UserPlaylistParams) {
  return request({
    url: '/user/playlist',
    method: 'get',
    params,
  })
}
