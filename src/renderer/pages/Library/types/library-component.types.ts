import type {
  LibraryMvItem,
  LibraryPageData,
  LibraryPlaylistItem,
  LibrarySongItem,
  PlaylistSourceValue,
} from './library-domain.types'

export type CreatePlaylistPayload = {
  name: string
  privacy?: '10'
}

export interface CreatePlaylistDialogProps {
  open: boolean
  submitting?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: CreatePlaylistPayload) => Promise<void> | void
}

export interface LibraryAlbumPanelProps {
  active: boolean
}

export interface LibraryArtistPanelProps {
  active: boolean
}

export interface LibraryCloudPanelProps {
  active: boolean
}

export interface LibraryHeroProps {
  songs: LibrarySongItem[]
  songCount: number
  coverImgUrl?: string
  likedSongsPreviewRefreshing?: boolean
  onOpenLikedSongs: () => void
  onPlayLikedSongs: () => void
  onSongLikeChangeSuccess: (songId: number, nextLiked: boolean) => void
}

export interface LibraryMvCardProps {
  mv: LibraryMvItem
  onOpen: (id: number) => void
}

export interface LibraryMvPanelProps {
  active: boolean
  onOpen: (id: number) => void
}

export interface LibraryPlaylistPanelProps {
  playlists: LibraryPlaylistItem[]
  loading?: boolean
  onOpen: (id: number) => void
}

export interface LibraryQuickSongListProps {
  songs: LibrarySongItem[]
  refreshing?: boolean
  onSongLikeChangeSuccess: (songId: number, nextLiked: boolean) => void
}

export interface LibraryTabsSectionProps {
  data: LibraryPageData
  playlistLoading?: boolean
  onOpenPlaylist: (id: number) => void
  onOpenMv: (id: number) => void
  playlistSource: PlaylistSourceValue
  onPlaylistSourceChange: (value: PlaylistSourceValue) => void
  onOpenCreatePlaylist: () => void
}
