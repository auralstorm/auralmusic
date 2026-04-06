import request from '@/lib/request'

// 获取排行榜列表
export function getTopList() {
  return request.get('/toplist')
}
// 获取排行榜详情
export function getTopListDetailById(id: string) {
  return request.get(`/playlist/detail?id=${id}`)
}
