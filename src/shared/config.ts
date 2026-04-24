import { IPC_CHANNELS } from './ipc/config.ts'
import type { ImportedLxMusicSource } from './lx-music-source.ts'
import type { PlaybackMode } from './playback.ts'
import {
  DEFAULT_EQUALIZER_CONFIG,
  normalizeEqualizerConfig,
  type EqualizerConfig,
} from './equalizer.ts'
import {
  DEFAULT_SHORTCUT_BINDINGS,
  type ShortcutBindings,
} from './shortcut-keys.ts'

export const AUDIO_QUALITY_LEVELS = [
  'standard',
  'higher',
  'exhigh',
  'lossless',
  'hires',
  'jyeffect',
  'sky',
  'dolby',
  'jymaster',
] as const

export type AudioQualityLevel = (typeof AUDIO_QUALITY_LEVELS)[number]

export const DOWNLOAD_FILE_NAME_PATTERNS = [
  'song-artist',
  'artist-song',
] as const

export type DownloadFileNamePattern =
  (typeof DOWNLOAD_FILE_NAME_PATTERNS)[number]

export const DOWNLOAD_QUALITY_POLICIES = ['strict', 'fallback'] as const

export type DownloadQualityPolicy = (typeof DOWNLOAD_QUALITY_POLICIES)[number]

export const MUSIC_SOURCE_PROVIDERS = [
  'migu',
  'kugou',
  'pyncmd',
  'bilibili',
  'lxMusic',
] as const

export type MusicSourceProvider = (typeof MUSIC_SOURCE_PROVIDERS)[number]

export const ENHANCED_SOURCE_MODULES = [
  'unm',
  'bikonoo',
  'gdmusic',
  'msls',
  'qijieya',
  'baka',
] as const

export type EnhancedSourceModule = (typeof ENHANCED_SOURCE_MODULES)[number]

export type CloseBehavior = 'ask' | 'minimize' | 'quit'
export type PlayerBackgroundMode = 'off' | 'static' | 'dynamic'

// 复古预设只保留一份元数据，避免设置页和 schema 长期各自维护一套枚举。
export const RETRO_COVER_PRESET_OPTIONS = [
  { label: '关闭', value: 'off' },
  { label: 'CCD 数码复古', value: 'ccd' },
  { label: '柯达金胶卷（90 年代）', value: 'kodak90s' },
  { label: '千禧 Y2K', value: 'y2k' },
  { label: '港风电影复古', value: 'hkCinema' },
  { label: '低饱和灰调旧胶片', value: 'desaturatedFilm' },
  { label: '经典黑胶封面', value: 'vinylClassic' },
  { label: 'CRT 老式显像管', value: 'crt' },
  { label: '拍立得复古', value: 'polaroid' },
] as const
export type RetroCoverPreset =
  (typeof RETRO_COVER_PRESET_OPTIONS)[number]['value']
export const RETRO_COVER_PRESETS = RETRO_COVER_PRESET_OPTIONS.map(
  option => option.value
) as readonly RetroCoverPreset[]

export const ANIMATION_EFFECT_LEVELS = ['standard', 'reduced', 'off'] as const

export type AnimationEffectLevel = (typeof ANIMATION_EFFECT_LEVELS)[number]

export const LOCAL_LIBRARY_SCAN_FORMAT_OPTIONS = [
  { label: 'MP3', value: 'mp3' },
  { label: 'FLAC', value: 'flac' },
  { label: 'M4A', value: 'm4a' },
  { label: 'AAC', value: 'aac' },
  { label: 'OGG', value: 'ogg' },
  { label: 'WAV', value: 'wav' },
] as const

export type LocalLibraryScanFormat =
  (typeof LOCAL_LIBRARY_SCAN_FORMAT_OPTIONS)[number]['value']
export const LOCAL_LIBRARY_SCAN_FORMATS = LOCAL_LIBRARY_SCAN_FORMAT_OPTIONS.map(
  option => option.value
) as readonly LocalLibraryScanFormat[]

export const MIN_PLAYBACK_SPEED = 0.5
export const MAX_PLAYBACK_SPEED = 2.0
export const DEFAULT_DISK_CACHE_MAX_BYTES = 1024 * 1024 * 1024

export interface AppConfig {
  theme: 'light' | 'dark' | 'system'
  themeColor: string | null
  fontFamily: string
  audioOutputDeviceId: string
  playbackVolume: number
  playbackMode: PlaybackMode
  playbackSpeed: number
  equalizer: EqualizerConfig
  rememberPlaybackSession: boolean
  dynamicCoverEnabled: boolean
  retroCoverPreset: RetroCoverPreset
  showLocalLibraryMenu: boolean
  localLibraryRoots: string[]
  localLibraryScanFormats: LocalLibraryScanFormat[]
  localLibraryOnlineLyricMatchEnabled: boolean
  showLyricTranslation: boolean
  lyricsKaraokeEnabled: boolean
  musicSourceEnabled: boolean
  musicSourceProviders: MusicSourceProvider[]
  enhancedSourceModules: EnhancedSourceModule[]
  luoxueSourceEnabled: boolean
  luoxueSourceUrl: string
  luoxueMusicSourceScript: ImportedLxMusicSource | null
  luoxueMusicSourceScripts: ImportedLxMusicSource[]
  activeLuoxueMusicSourceScriptId: string | null
  customMusicApiEnabled: boolean
  customMusicApiUrl: string
  quality: AudioQualityLevel
  globalShortcutEnabled: boolean
  shortcutBindings: ShortcutBindings
  autoStartEnabled: boolean
  closeBehavior: CloseBehavior
  rememberCloseChoice: boolean
  playerBackgroundMode: PlayerBackgroundMode
  animationEffect: AnimationEffectLevel
  immersivePlayerControls: boolean
  playbackFadeEnabled: boolean
  diskCacheEnabled: boolean
  diskCacheDir: string
  diskCacheMaxBytes: number
  downloadEnabled: boolean
  downloadQuality: AudioQualityLevel
  downloadQualityPolicy: DownloadQualityPolicy
  downloadSkipExisting: boolean
  downloadDir: string
  downloadConcurrency: number
  downloadFileNamePattern: DownloadFileNamePattern
  downloadEmbedCover: boolean
  downloadEmbedLyrics: boolean
  downloadEmbedTranslatedLyrics: boolean
}

export const defaultConfig: AppConfig = {
  theme: 'system',
  themeColor: null,
  fontFamily: 'Inter Variable',
  audioOutputDeviceId: 'default',
  playbackVolume: 70,
  playbackMode: 'repeat-all',
  playbackSpeed: 1.0,
  equalizer: DEFAULT_EQUALIZER_CONFIG,
  rememberPlaybackSession: false,
  dynamicCoverEnabled: true,
  retroCoverPreset: 'off',
  showLocalLibraryMenu: true,
  localLibraryRoots: [],
  localLibraryScanFormats: [...LOCAL_LIBRARY_SCAN_FORMATS],
  localLibraryOnlineLyricMatchEnabled: false,
  showLyricTranslation: false,
  lyricsKaraokeEnabled: true,
  musicSourceEnabled: false,
  musicSourceProviders: [],
  enhancedSourceModules: ['unm', 'bikonoo', 'gdmusic', 'msls', 'qijieya'],
  luoxueSourceEnabled: false,
  luoxueSourceUrl: '',
  luoxueMusicSourceScript: null,
  luoxueMusicSourceScripts: [],
  activeLuoxueMusicSourceScriptId: null,
  customMusicApiEnabled: false,
  customMusicApiUrl: '',
  quality: 'higher',
  globalShortcutEnabled: false,
  shortcutBindings: DEFAULT_SHORTCUT_BINDINGS,
  autoStartEnabled: false,
  closeBehavior: 'ask',
  rememberCloseChoice: false,
  playerBackgroundMode: 'static',
  animationEffect: 'standard',
  immersivePlayerControls: false,
  playbackFadeEnabled: false,
  diskCacheEnabled: false,
  diskCacheDir: '',
  diskCacheMaxBytes: DEFAULT_DISK_CACHE_MAX_BYTES,
  downloadEnabled: false,
  downloadQuality: 'higher',
  downloadQualityPolicy: 'fallback',
  downloadSkipExisting: true,
  downloadDir: '',
  downloadConcurrency: 3,
  downloadFileNamePattern: 'song-artist',
  downloadEmbedCover: true,
  downloadEmbedLyrics: true,
  downloadEmbedTranslatedLyrics: false,
}

export function normalizeDynamicCoverEnabled(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.dynamicCoverEnabled
}

export function normalizeRetroCoverPreset(value: unknown): RetroCoverPreset {
  return typeof value === 'string' &&
    RETRO_COVER_PRESETS.includes(value as RetroCoverPreset)
    ? (value as RetroCoverPreset)
    : defaultConfig.retroCoverPreset
}

export function normalizeShowLocalLibraryMenu(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.showLocalLibraryMenu
}

export function normalizeLocalLibraryRoots(value: unknown) {
  if (!Array.isArray(value)) {
    return defaultConfig.localLibraryRoots
  }

  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map(item => item.trim())
        .filter(Boolean)
    ),
  ]
}

export function normalizeLocalLibraryScanFormats(value: unknown) {
  if (!Array.isArray(value)) {
    return defaultConfig.localLibraryScanFormats
  }

  const formats = [
    ...new Set(
      value.filter((item): item is LocalLibraryScanFormat => {
        return (
          typeof item === 'string' &&
          LOCAL_LIBRARY_SCAN_FORMATS.includes(item as LocalLibraryScanFormat)
        )
      })
    ),
  ]

  return formats.length > 0 ? formats : defaultConfig.localLibraryScanFormats
}

export function normalizeLocalLibraryOnlineLyricMatchEnabled(value: unknown) {
  return typeof value === 'boolean'
    ? value
    : defaultConfig.localLibraryOnlineLyricMatchEnabled
}

export function normalizeRememberPlaybackSession(value: unknown) {
  return typeof value === 'boolean'
    ? value
    : defaultConfig.rememberPlaybackSession
}

export function normalizePlaybackSpeed(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return defaultConfig.playbackSpeed
  }

  return Math.min(MAX_PLAYBACK_SPEED, Math.max(MIN_PLAYBACK_SPEED, value))
}

export function normalizeEqualizerConfigValue(value: unknown) {
  return normalizeEqualizerConfig(value)
}

export function normalizePlayerBackgroundMode(value: unknown) {
  return value === 'off' || value === 'dynamic' || value === 'static'
    ? value
    : defaultConfig.playerBackgroundMode
}

export function normalizeAnimationEffect(value: unknown) {
  return typeof value === 'string' &&
    ANIMATION_EFFECT_LEVELS.includes(value as AnimationEffectLevel)
    ? (value as AnimationEffectLevel)
    : defaultConfig.animationEffect
}

export function normalizeImmersivePlayerControls(value: unknown) {
  return typeof value === 'boolean'
    ? value
    : defaultConfig.immersivePlayerControls
}

export function normalizePlaybackFadeEnabled(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.playbackFadeEnabled
}

export function normalizeDiskCacheMaxBytes(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return defaultConfig.diskCacheMaxBytes
  }

  return Math.floor(value)
}

export function normalizeShowLyricTranslation(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.showLyricTranslation
}

export function normalizeLyricsKaraokeEnabled(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.lyricsKaraokeEnabled
}

export function normalizeDiskCacheEnabled(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.diskCacheEnabled
}

export function normalizeDiskCacheDir(value: unknown) {
  return typeof value === 'string' ? value : defaultConfig.diskCacheDir
}

export function normalizeDownloadEnabled(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.downloadEnabled
}

export function normalizeDownloadQuality(value: unknown) {
  if (value === 'high') {
    return 'higher'
  }

  return typeof value === 'string' &&
    AUDIO_QUALITY_LEVELS.includes(value as AudioQualityLevel)
    ? (value as AudioQualityLevel)
    : defaultConfig.downloadQuality
}

export function normalizeDownloadQualityPolicy(value: unknown) {
  return typeof value === 'string' &&
    DOWNLOAD_QUALITY_POLICIES.includes(value as DownloadQualityPolicy)
    ? (value as DownloadQualityPolicy)
    : defaultConfig.downloadQualityPolicy
}

export function normalizeDownloadSkipExisting(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.downloadSkipExisting
}

export function normalizeDownloadDir(value: unknown) {
  if (typeof value !== 'string') {
    return defaultConfig.downloadDir
  }

  const normalizedValue = value.trim()
  if (!normalizedValue) {
    return defaultConfig.downloadDir
  }

  return normalizedValue
}

export function normalizeDownloadConcurrency(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return defaultConfig.downloadConcurrency
  }

  return Math.min(10, Math.max(1, Math.floor(value)))
}

export function normalizeEnhancedSourceModules(
  value: unknown
): EnhancedSourceModule[] {
  if (!Array.isArray(value)) {
    return defaultConfig.enhancedSourceModules
  }

  const modules = value.filter((item): item is EnhancedSourceModule => {
    return (
      typeof item === 'string' &&
      ENHANCED_SOURCE_MODULES.includes(item as EnhancedSourceModule)
    )
  })

  return [...new Set(modules)]
}

export function normalizeDownloadFileNamePattern(value: unknown) {
  return typeof value === 'string' &&
    DOWNLOAD_FILE_NAME_PATTERNS.includes(value as DownloadFileNamePattern)
    ? (value as DownloadFileNamePattern)
    : defaultConfig.downloadFileNamePattern
}

export function normalizeDownloadEmbedCover(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.downloadEmbedCover
}

export function normalizeDownloadEmbedLyrics(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.downloadEmbedLyrics
}

export function normalizeDownloadEmbedTranslatedLyrics(
  value: unknown,
  embedLyrics = defaultConfig.downloadEmbedLyrics
) {
  if (!embedLyrics) {
    return false
  }

  return typeof value === 'boolean'
    ? value
    : defaultConfig.downloadEmbedTranslatedLyrics
}

export { IPC_CHANNELS }
