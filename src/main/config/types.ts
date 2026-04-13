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

export interface AppConfig {
  theme: 'light' | 'dark' | 'system'
  fontFamily: string
  audioOutputDeviceId: string
  playbackVolume: number
  playbackMode: PlaybackMode
  dynamicCoverEnabled: boolean
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
}

export const defaultConfig: AppConfig = {
  theme: 'system',
  fontFamily: 'Inter Variable',
  audioOutputDeviceId: 'default',
  playbackVolume: 70,
  playbackMode: 'repeat-all',
  dynamicCoverEnabled: true,
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
}

export function normalizeDynamicCoverEnabled(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.dynamicCoverEnabled
}

export function normalizePlayerBackgroundMode(value: unknown) {
  return value === 'off' || value === 'dynamic' || value === 'static'
    ? value
    : defaultConfig.playerBackgroundMode
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
