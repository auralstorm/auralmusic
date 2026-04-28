import request from '@/lib/request'
import { normalizeCollectPlaylistTargets } from '@/model'
import type { UserPlaylistParams } from '@/types/api'

/** 获取用户歌单列表，包含创建歌单和订阅歌单。 */
export function userPlaylist(params: UserPlaylistParams) {
  return request({
    url: '/user/playlist',
    method: 'get',
    params,
  })
}

/**
 * 获取“收藏到歌单”可选目标
 *
 * 在 API 层直接复用 model 归一化，只向组件暴露可编辑目标列表，
 * 过滤订阅歌单和非当前用户的“我喜欢的音乐”。
 */
export async function getCollectPlaylistTargets(params: UserPlaylistParams) {
  const response = await userPlaylist(params)
  return normalizeCollectPlaylistTargets(response.data, Number(params.uid))
}
