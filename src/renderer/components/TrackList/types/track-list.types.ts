export interface TrackListArtist {
  id?: number
  name: string
}

export interface TrackListItemData {
  artists?: TrackListArtist[] | null
  id: number
  coverUrl?: string
  name: string
  artistNames?: string
  duration: number
  albumName?: string
}

export type TrackListVariant = 'default' | 'hot' | 'quick'

export interface TrackListProps {
  data: TrackListItemData[]
  coverUrl?: string
  emptyText?: string
  endText?: string
  hasMore?: boolean
  loading?: boolean
  loadingText?: string
  playbackQueueKey?: string
  onLikeChangeSuccess?: (songId: number, nextLiked: boolean) => void
  onEndReached?: () => void
}

export interface TrackListItemProps {
  item: TrackListItemData
  type?: TrackListVariant
  coverUrl?: string
  isActive?: boolean
  isPlaying?: boolean
  onPlay?: () => void
  onAddToQueue?: () => void
  onLikeChangeSuccess?: (songId: number, nextLiked: boolean) => void
}
