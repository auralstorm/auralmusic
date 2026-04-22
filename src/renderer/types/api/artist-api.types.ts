export interface ArtistListParams {
  area: -1 | 7 | 96 | 8 | 16 | 0
  type: -1 | 1 | 2 | 3
  initial: -1 | 0 | string
  offset?: number
  limit?: number
}

export interface SubscribedArtistListParams {
  limit?: number
  offset?: number
}

export interface ArtistDetailParams {
  id: number | string
}

export interface ArtistListPageParams extends ArtistDetailParams {
  limit?: number
  offset?: number
}

export interface ArtistSongsParams extends ArtistDetailParams {
  order?: 'hot' | 'time'
  limit?: number
  offset?: number
}

export interface ToggleArtistSubscriptionParams {
  id: number
  t: 0 | 1
}
