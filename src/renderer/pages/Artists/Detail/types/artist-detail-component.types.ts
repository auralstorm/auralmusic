import type { Ref } from 'react'

import type {
  ArtistAlbumItem,
  ArtistDescPayload,
  ArtistDetailProfile,
  ArtistLatestReleaseData,
  ArtistMvItem,
  ArtistSimilarItem,
  ArtistTopSongItem,
} from '../../types'

export interface ArtistDescriptionProps {
  description: ArtistDescPayload
}

export interface ArtistHeroProps {
  profile: ArtistDetailProfile
  summary: string
  isFollowed: boolean
  followLoading: boolean
  onPlay: () => void
  onToggleFollowedArtist: () => void
}

export interface ArtistLatestReleaseProps {
  latestRelease: ArtistLatestReleaseData
  albumsLoading?: boolean
  mvsLoading?: boolean
  onToAlbumDetail: (id: number) => void
  onToMvDetail: (id: number) => void
}

export interface ArtistMediaTabsProps {
  albums: ArtistAlbumItem[]
  mvs: ArtistMvItem[]
  similarArtists: ArtistSimilarItem[]
  albumLoading?: boolean
  mvLoading?: boolean
  similarArtistsLoading?: boolean
  albumHasMore?: boolean
  mvHasMore?: boolean
  albumSentinelRef: Ref<HTMLDivElement>
  mvSentinelRef: Ref<HTMLDivElement>
  onToAlbumDetail: (id: number) => void
  onToMvDetail: (id: number) => void
  onToArtistDetail: (id: number) => void
}

export type ArtistMediaTabValue = 'albums' | 'mvs' | 'similar-artists'

export interface ArtistAlbumsPanelProps {
  albums: ArtistAlbumItem[]
  albumLoading?: boolean
  albumHasMore?: boolean
  albumSentinelRef: Ref<HTMLDivElement>
  onToAlbumDetail: (id: number) => void
}

export interface ArtistMvsPanelProps {
  mvs: ArtistMvItem[]
  mvLoading?: boolean
  mvHasMore?: boolean
  mvSentinelRef: Ref<HTMLDivElement>
  onToMvDetail: (id: number) => void
}

export interface ArtistSimilarArtistsPanelProps {
  artists: ArtistSimilarItem[]
  similarArtistsLoading?: boolean
  onToArtistDetail: (id: number) => void
}

export interface ArtistAlbumCardProps {
  album: ArtistAlbumItem
  onClick: (albumId: number) => void
}

export interface ArtistMvCardProps {
  mv: ArtistMvItem
  onClick: (mvId: number) => void
}

export interface ArtistTopSongsProps {
  artistId: number
  songs: ArtistTopSongItem[]
  onViewAll: () => void
}

export interface SimilarArtistsProps {
  artists: ArtistSimilarItem[]
}
