import type { AuthSession, AuthUser } from '../../../shared/auth.ts'
import type {
  PlaybackAdvanceReason,
  PlaybackMode,
  PlaybackStatus,
  PlaybackTrack,
} from '../../../shared/playback.ts'
import type { AppConfig } from '../../../shared/config.ts'
import type { LoginMode } from '@/types/api'
import type { AlbumListItem } from '@/pages/Albums/types'
import type { ArtistListItem } from '@/pages/Artists/types'
import type { DownloadTask } from '@/pages/Downloads/types'
import type { DailySong } from '@/pages/Home/types'
import type { CollectPlaylistSongContext } from './collect-to-playlist.types'

export type LoginStatus = 'anonymous' | 'authenticated' | 'expired'

export type LoginPayload =
  | {
      mode: 'email'
      email: string
      password: string
    }
  | {
      mode: 'phone-password'
      phone: string
      password: string
      countrycode?: string
    }
  | {
      mode: 'phone-captcha'
      phone: string
      captcha: string
      countrycode?: string
    }

export interface QrState {
  key: string
  qrImg: string
  qrUrl: string
  polling: boolean
}

export interface LoginQrKeyResponse {
  data?: {
    unikey?: string
  }
  unikey?: string
}

export interface LoginQrCreateResponse {
  data?: {
    qrimg?: string
    qrurl?: string
  }
  qrimg?: string
  qrurl?: string
}

export interface LoginQrCheckResponse {
  code?: number
  cookie?: string
  data?: {
    code?: number
    cookie?: string
  }
}

export interface AuthStoreState {
  user: AuthUser | null
  session: AuthSession | null
  isLoading: boolean
  dialogOpen: boolean
  loginMode: LoginMode
  loginStatus: LoginStatus
  errorMessage: string | null
  hasHydrated: boolean
  hydrateAuth: () => Promise<void>
  openLoginDialog: (mode?: LoginMode) => void
  closeLoginDialog: () => void
  setLoginMode: (mode: LoginMode) => void
  clearError: () => void
  loginWithCurrentMode: (payload: LoginPayload) => Promise<void>
  sendCaptchaCode: (phone: string, ctcode?: string) => Promise<void>
  refreshQrCode: () => Promise<QrState>
  pollQrLogin: () => Promise<void>
  logout: () => Promise<void>
}

export type DownloadTaskUnsubscribe = (() => void) | null

export interface DownloadTaskStoreState {
  tasks: DownloadTask[]
  initialized: boolean
  unsubscribe: DownloadTaskUnsubscribe
  setTasks: (tasks: DownloadTask[]) => void
  refreshTasks: () => Promise<DownloadTask[]>
  startSubscription: () => Promise<void>
  stopSubscription: () => void
}

export interface UserStoreState {
  likedPlaylist: unknown[]
  myLikedPlaylistId: number | null
  likedArtists: ArtistListItem[]
  likedAlbums: AlbumListItem[]
  likedArtistIds: Set<number>
  likedAlbumIds: Set<number>
  likedSongIds: Set<number>
  likedSongPendingIds: Set<number>
  likedArtistsLoaded: boolean
  likedAlbumsLoaded: boolean
  likedSongsLoaded: boolean
  likedArtistsLoading: boolean
  likedAlbumsLoading: boolean
  likedSongsLoading: boolean
  fetchLikedPlaylist: () => Promise<void>
  fetchLikedArtists: () => Promise<void>
  fetchLikedAlbums: () => Promise<void>
  fetchLikedSongs: () => Promise<void>
  isArtistLiked: (artistId: number) => boolean
  isAlbumLiked: (albumId: number) => boolean
  isSongLiked: (songId: number) => boolean
  resetUserData: () => void
  toggleFollowed: (
    artistId: number,
    nextFollowed: boolean,
    artist?: ArtistListItem
  ) => void
  toggleLikedAlbum: (
    albumId: number,
    nextLiked: boolean,
    album?: AlbumListItem
  ) => void
  toggleLikedSong: (songId: number, nextLiked: boolean) => void
  setSongLikePending: (songId: number, pending: boolean) => void
}

export interface DailySongsStoreState {
  list: DailySong[]
  setList: (list: DailySong[]) => void
  getTopOne: DailySong[]
}

export interface SearchDialogStoreState {
  open: boolean
  setOpen: (open: boolean) => void
  openDialog: () => void
  closeDialog: () => void
  toggleDialog: () => void
}

export interface CollectToPlaylistStoreState {
  open: boolean
  song: CollectPlaylistSongContext | null
  setOpen: (open: boolean) => void
  openDrawer: (song: CollectPlaylistSongContext) => void
  closeDrawer: () => void
}

export interface MvDrawerStoreState {
  open: boolean
  mvId: number | null
  setOpen: (open: boolean) => void
  openDrawer: (mvId: number) => void
  closeDrawer: () => void
}

export interface PlaybackQueueDrawerStoreState {
  open: boolean
  setOpen: (open: boolean) => void
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void
}

export interface PlaybackSessionSnapshot {
  queue: PlaybackTrack[]
  currentIndex: number
  progress: number
  duration: number
  playbackMode: PlaybackMode
}

export type PlaybackSessionStorageLike = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>

export interface PlaybackStoreState {
  queue: PlaybackTrack[]
  queueSourceKey: string | null
  currentIndex: number
  currentTrack: PlaybackTrack | null
  playbackMode: PlaybackMode
  shuffleOrder: number[]
  shuffleCursor: number
  status: PlaybackStatus
  shouldAutoPlayOnLoad: boolean
  progress: number
  pendingRestoreProgress: number
  duration: number
  volume: number
  lastAudibleVolume: number
  error: string
  requestId: number
  seekRequestId: number
  seekPosition: number
  isPlayerSceneOpen: boolean
  playQueueFromIndex: (
    tracks: PlaybackTrack[],
    startIndex: number,
    sourceKey?: string | null
  ) => void
  playCurrentQueueIndex: (index: number) => void
  appendToQueue: (tracks: PlaybackTrack[]) => void
  syncQueueFromSource: (sourceKey: string, tracks: PlaybackTrack[]) => void
  patchTrackMetadata: (
    trackId: number,
    patch: Partial<
      Pick<PlaybackTrack, 'coverUrl' | 'lyricText' | 'translatedLyricText'>
    >
  ) => void
  togglePlay: () => void
  setPlaybackMode: (mode: PlaybackMode) => void
  playNext: (reason?: PlaybackAdvanceReason) => boolean
  playPrevious: () => boolean
  setProgress: (progress: number) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  seekTo: (positionMs: number) => void
  setPlayerSceneOpen: (open: boolean) => void
  openPlayerScene: () => void
  closePlayerScene: () => void
  restoreSession: (snapshot: PlaybackSessionSnapshot) => void
  clearPendingRestoreProgress: () => void
  markPlaybackLoading: () => void
  markPlaybackPlaying: () => void
  markPlaybackPaused: () => void
  markPlaybackError: (error: string) => void
  resetPlayback: () => void
}

export interface ConfigStoreState {
  config: AppConfig
  isLoading: boolean
  initConfig: () => Promise<void>
  setConfig: <K extends keyof AppConfig>(
    key: K,
    value: AppConfig[K]
  ) => Promise<void>
  resetConfig: () => Promise<void>
}
