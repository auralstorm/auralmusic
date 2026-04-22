import request from '@/lib/request'
import type {
  ArtistDetailParams,
  ArtistListPageParams,
  ArtistListParams,
  ArtistSongsParams,
  SubscribedArtistListParams,
  ToggleArtistSubscriptionParams,
} from '@/types/api'

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

export function getArtistSongs(params: ArtistSongsParams) {
  return request.get('/artist/songs', {
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

export function followArtist(params: ToggleArtistSubscriptionParams) {
  return request.get('/artist/sub', {
    params,
  })
}
