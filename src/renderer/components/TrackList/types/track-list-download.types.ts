import type { SongDownloadPayload } from '../../../../shared/download.ts'
import type {
  LxMusicInfo,
  LxSourceKey,
} from '../../../../shared/lx-music-source.ts'
import type {
  DownloadResolutionPolicy,
  ResolvedDownloadSource,
} from '../../../services/download/download-source-resolver.ts'

export interface TrackListDownloadSong {
  artists?: Array<{ name: string }> | null
  id: number
  coverUrl?: string
  name: string
  artistNames?: string
  duration: number
  albumName?: string
  fee?: number
  lockedPlatform?: LxSourceKey
  lxInfo?: Partial<
    Pick<
      LxMusicInfo,
      | 'songmid'
      | 'hash'
      | 'strMediaMid'
      | 'copyrightId'
      | 'albumId'
      | 'source'
      | 'img'
    >
  >
}

export interface TrackDownloadSource {
  id: number
  name: string
  artistNames: string
  albumName: string
  coverUrl: string
  duration: number
  fee?: number
  lockedPlatform?: LxSourceKey
  lxInfo?: TrackListDownloadSong['lxInfo']
}

export interface ResolveDownloadSourceInput {
  track: TrackDownloadSource
  requestedQuality: SongDownloadPayload['requestedQuality']
  policy: DownloadResolutionPolicy
}

export type ResolveDownloadSource = (
  input: ResolveDownloadSourceInput
) => Promise<ResolvedDownloadSource | null>
