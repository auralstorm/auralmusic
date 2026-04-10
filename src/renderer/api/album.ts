import request from '@/lib/request'

export interface SubscribedAlbumListParams {
  limit?: number
  offset?: number
  timestamp?: number
}

export function getAlbumNewSet() {
  return request.get('/album/newest')
}

export function getAlbumDetail(id: number | string) {
  return request.get('/album', {
    params: { id },
  })
}

export function getSubscribedAlbums(params: SubscribedAlbumListParams) {
  return request.get('/album/sublist', {
    params,
  })
}

export interface NewAlbumParams {
  area?: 'ALL' | 'ZH' | 'EA' | 'KR' | 'JP'
  limit?: number
  offset?: number
}

export function getNewAlbums(params: NewAlbumParams) {
  return request.get('/album/new', {
    params,
  })
}

export function toggleAlbumSubscription(params: { id: number; t: 0 | 1 }) {
  return request.get('/album/sub', {
    params,
  })
}

export const followAlbum = toggleAlbumSubscription
