import request from '@/lib/request'
import type { UserCloudParams } from '@/types/api'

/**
 * 获取用户云盘歌曲列表
 *
 * 云盘接口通常分页较大，播放队列补全会按 offset/limit 多次调用。
 */
export function getUserCloud(params: UserCloudParams) {
  return request.get('/user/cloud', {
    params,
  })
}
