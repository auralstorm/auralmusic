import type { ImportedLxMusicSource } from '../../shared/lx-music-source.ts'
import type { PlaybackMode } from '../../shared/playback.ts'
import {
  DEFAULT_SHORTCUT_BINDINGS,
  type ShortcutBindings,
} from '../../shared/shortcut-keys.ts'

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

export const MUSIC_SOURCE_PROVIDERS = [
  'migu',
  'kugou',
  'pyncmd',
  'bilibili',
  'lxMusic',
] as const

export type MusicSourceProvider = (typeof MUSIC_SOURCE_PROVIDERS)[number]

export type CloseBehavior = 'ask' | 'minimize' | 'quit'
export type PlayerBackgroundMode = 'off' | 'static' | 'dynamic'
export const MIN_PLAYBACK_SPEED = 0.5
export const MAX_PLAYBACK_SPEED = 2.0
export const DEFAULT_DISK_CACHE_MAX_BYTES = 1024 * 1024 * 1024

export interface AppConfig {
  theme: 'light' | 'dark' | 'system'
  fontFamily: string
  audioOutputDeviceId: string
  playbackVolume: number
  playbackMode: PlaybackMode
  playbackSpeed: number
  dynamicCoverEnabled: boolean
  showLyricTranslation: boolean
  lyricsKaraokeEnabled: boolean
  musicSourceEnabled: boolean
  musicSourceProviders: MusicSourceProvider[]
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
  diskCacheEnabled: boolean
  diskCacheDir: string
  diskCacheMaxBytes: number
}

export const defaultConfig: AppConfig = {
  theme: 'system',
  fontFamily: 'Inter Variable',
  audioOutputDeviceId: 'default',
  playbackVolume: 70,
  playbackMode: 'repeat-all',
  playbackSpeed: 1.0,
  dynamicCoverEnabled: true,
  showLyricTranslation: false,
  lyricsKaraokeEnabled: true,
  musicSourceEnabled: false,
  musicSourceProviders: ['migu', 'kugou', 'pyncmd', 'bilibili'],
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
  diskCacheEnabled: false,
  diskCacheDir: '',
  diskCacheMaxBytes: DEFAULT_DISK_CACHE_MAX_BYTES,
}

export function normalizeDynamicCoverEnabled(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.dynamicCoverEnabled
}

export function normalizePlaybackSpeed(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return defaultConfig.playbackSpeed
  }

  return Math.min(MAX_PLAYBACK_SPEED, Math.max(MIN_PLAYBACK_SPEED, value))
}

export function normalizePlayerBackgroundMode(value: unknown) {
  return value === 'off' || value === 'dynamic' || value === 'static'
    ? value
    : defaultConfig.playerBackgroundMode
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

export const IPC_CHANNELS = {
  CONFIG: {
    GET: 'config:get',
    SET: 'config:set',
    RESET: 'config:reset',
  },
  MUSIC_SOURCE: {
    SELECT_LX_SCRIPT: 'music-source:select-lx-script',
    SAVE_LX_SCRIPT: 'music-source:save-lx-script',
    READ_LX_SCRIPT: 'music-source:read-lx-script',
    REMOVE_LX_SCRIPT: 'music-source:remove-lx-script',
    DOWNLOAD_LX_SCRIPT: 'music-source:download-lx-script',
    LX_HTTP_REQUEST: 'music-source:lx-http-request',
  },
} as const
