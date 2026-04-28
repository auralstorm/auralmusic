import type { PlaybackTrack } from '../../../shared/playback.ts'

export const BUILTIN_PLATFORM_SOURCES = ['wy', 'tx', 'kw', 'kg', 'mg'] as const

export type BuiltinPlatformSource = (typeof BUILTIN_PLATFORM_SOURCES)[number]

export type PlatformMetadataRequest = Pick<
  PlaybackTrack,
  | 'id'
  | 'name'
  | 'artistNames'
  | 'albumName'
  | 'duration'
  | 'coverUrl'
  | 'lockedPlatform'
  | 'lxInfo'
>

export type BuiltinLyricResult = {
  lyric: string
  translatedLyric?: string
  yrc?: string
}

export type BuiltinCoverResult = {
  coverUrl: string
}

export type BuiltinLyricProvider = {
  getLyric(track: PlatformMetadataRequest): Promise<BuiltinLyricResult | null>
}

export type BuiltinCoverProvider = {
  getCover(track: PlatformMetadataRequest): Promise<BuiltinCoverResult | null>
}

export type BuiltinLyricProviderRegistry = Partial<
  Record<BuiltinPlatformSource, BuiltinLyricProvider>
>

export type BuiltinCoverProviderRegistry = Partial<
  Record<BuiltinPlatformSource, BuiltinCoverProvider>
>
