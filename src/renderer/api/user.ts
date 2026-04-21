import request from '@/lib/request'
import { normalizeCollectPlaylistTargets } from '@/model'
import type { UserPlaylistParams } from '@/types/api'

export function userPlaylist(params: UserPlaylistParams) {
  return request({
    url: '/user/playlist',
    method: 'get',
    params,
  })
}

export async function getCollectPlaylistTargets(params: UserPlaylistParams) {
  const response = await userPlaylist(params)
  return normalizeCollectPlaylistTargets(response.data, Number(params.uid))
}
