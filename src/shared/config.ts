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

/** 网易云音质等级，从标准音质到沉浸/母带等高规格音质。 */
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

/** 下载文件命名模板，主进程下载服务会据此生成文件名。 */
export const DOWNLOAD_FILE_NAME_PATTERNS = [
  'song-artist',
  'artist-song',
] as const

export type DownloadFileNamePattern =
  (typeof DOWNLOAD_FILE_NAME_PATTERNS)[number]

/** 下载音质策略：strict 只尝试指定音质，fallback 允许向低音质降级。 */
export const DOWNLOAD_QUALITY_POLICIES = ['strict', 'fallback'] as const

export type DownloadQualityPolicy = (typeof DOWNLOAD_QUALITY_POLICIES)[number]

/** 音源提供方配置，内置平台和 LX 脚本共用这一层用户配置。 */
export const MUSIC_SOURCE_PROVIDERS = [
  'migu',
  'kugou',
  'pyncmd',
  'bilibili',
  'lxMusic',
] as const

export type MusicSourceProvider = (typeof MUSIC_SOURCE_PROVIDERS)[number]

/** 内置解灰模块枚举，空数组表示显式关闭全部增强模块。 */
export const ENHANCED_SOURCE_MODULES = [
  'unm',
  'bikonoo',
  'gdmusic',
  'msls',
  'qijieya',
  'baka',
] as const

export type EnhancedSourceModule = (typeof ENHANCED_SOURCE_MODULES)[number]

/** 窗口关闭行为：询问、最小化到托盘或直接退出。 */
export type CloseBehavior = 'ask' | 'minimize' | 'quit'
/** 播放器背景模式，dynamic 会启用更重的实时视觉效果。 */
export type PlayerBackgroundMode = 'off' | 'static' | 'dynamic'

/** 播放器封面展示风格选项，设置页和渲染逻辑共享。 */
export const PLAYER_ARTWORK_STYLE_OPTIONS = [
  { label: '默认封面', value: 'default' },
  { label: '黑胶唱片', value: 'vinylRecord' },
  { label: '镭射 CD', value: 'holographicCd' },
] as const
export type PlayerArtworkStyle =
  (typeof PLAYER_ARTWORK_STYLE_OPTIONS)[number]['value']
export const PLAYER_ARTWORK_STYLES = PLAYER_ARTWORK_STYLE_OPTIONS.map(
  option => option.value
) as readonly PlayerArtworkStyle[]

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
  { label: '像素街机 CRT', value: 'pixelArcade' },
] as const
export type RetroCoverPreset =
  (typeof RETRO_COVER_PRESET_OPTIONS)[number]['value']
export const RETRO_COVER_PRESETS = RETRO_COVER_PRESET_OPTIONS.map(
  option => option.value
) as readonly RetroCoverPreset[]

export const ANIMATION_EFFECT_LEVELS = ['standard', 'reduced', 'off'] as const

export type AnimationEffectLevel = (typeof ANIMATION_EFFECT_LEVELS)[number]

/** 本地曲库可扫描音频格式选项。 */
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
/** 默认磁盘缓存容量上限：1GB。 */
export const DEFAULT_DISK_CACHE_MAX_BYTES = 1024 * 1024 * 1024

/** 应用完整配置模型，main 持久化，renderer 通过 IPC 读取/写入。 */
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
  playerArtworkStyle: PlayerArtworkStyle
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

/** 新用户和重置配置时使用的默认配置。 */
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
  playerArtworkStyle: 'default',
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

/** 归一化动态封面开关，非布尔值回退默认值。 */
export function normalizeDynamicCoverEnabled(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.dynamicCoverEnabled
}

/** 归一化复古封面预设。 */
export function normalizeRetroCoverPreset(value: unknown): RetroCoverPreset {
  return typeof value === 'string' &&
    RETRO_COVER_PRESETS.includes(value as RetroCoverPreset)
    ? (value as RetroCoverPreset)
    : defaultConfig.retroCoverPreset
}

/** 归一化播放器封面展示风格。 */
export function normalizePlayerArtworkStyle(
  value: unknown
): PlayerArtworkStyle {
  return typeof value === 'string' &&
    PLAYER_ARTWORK_STYLES.includes(value as PlayerArtworkStyle)
    ? (value as PlayerArtworkStyle)
    : defaultConfig.playerArtworkStyle
}

/** 归一化本地曲库菜单显示开关。 */
export function normalizeShowLocalLibraryMenu(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.showLocalLibraryMenu
}

/** 归一化本地曲库根目录，去空、去重并保留用户配置顺序。 */
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

/** 归一化扫描格式，非法或空数组回退默认全格式。 */
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

/** 归一化在线歌词匹配开关。 */
export function normalizeLocalLibraryOnlineLyricMatchEnabled(value: unknown) {
  return typeof value === 'boolean'
    ? value
    : defaultConfig.localLibraryOnlineLyricMatchEnabled
}

/** 归一化播放会话恢复开关。 */
export function normalizeRememberPlaybackSession(value: unknown) {
  return typeof value === 'boolean'
    ? value
    : defaultConfig.rememberPlaybackSession
}

/** 归一化播放速度，限制在播放器支持范围内。 */
export function normalizePlaybackSpeed(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return defaultConfig.playbackSpeed
  }

  return Math.min(MAX_PLAYBACK_SPEED, Math.max(MIN_PLAYBACK_SPEED, value))
}

/** 配置层封装 equalizer 归一化，方便 config store 统一调用。 */
export function normalizeEqualizerConfigValue(value: unknown) {
  return normalizeEqualizerConfig(value)
}

/** 归一化播放器背景模式。 */
export function normalizePlayerBackgroundMode(value: unknown) {
  return value === 'off' || value === 'dynamic' || value === 'static'
    ? value
    : defaultConfig.playerBackgroundMode
}

/** 归一化动画强度，off/reduced 用于低性能或无障碍偏好。 */
export function normalizeAnimationEffect(value: unknown) {
  return typeof value === 'string' &&
    ANIMATION_EFFECT_LEVELS.includes(value as AnimationEffectLevel)
    ? (value as AnimationEffectLevel)
    : defaultConfig.animationEffect
}

/** 归一化沉浸播放器控件开关。 */
export function normalizeImmersivePlayerControls(value: unknown) {
  return typeof value === 'boolean'
    ? value
    : defaultConfig.immersivePlayerControls
}

/** 归一化播放淡入淡出开关。 */
export function normalizePlaybackFadeEnabled(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.playbackFadeEnabled
}

/** 归一化磁盘缓存容量，向下取整并拒绝非正数。 */
export function normalizeDiskCacheMaxBytes(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return defaultConfig.diskCacheMaxBytes
  }

  return Math.floor(value)
}

/** 归一化歌词翻译显示开关。 */
export function normalizeShowLyricTranslation(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.showLyricTranslation
}

/** 归一化卡拉 OK 歌词开关。 */
export function normalizeLyricsKaraokeEnabled(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.lyricsKaraokeEnabled
}

/** 归一化磁盘缓存开关。 */
export function normalizeDiskCacheEnabled(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.diskCacheEnabled
}

/** 归一化磁盘缓存目录，非字符串回退默认空目录。 */
export function normalizeDiskCacheDir(value: unknown) {
  return typeof value === 'string' ? value : defaultConfig.diskCacheDir
}

/** 归一化下载功能开关。 */
export function normalizeDownloadEnabled(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.downloadEnabled
}

/** 归一化下载音质，兼容旧版本 high -> higher。 */
export function normalizeDownloadQuality(value: unknown) {
  if (value === 'high') {
    return 'higher'
  }

  return typeof value === 'string' &&
    AUDIO_QUALITY_LEVELS.includes(value as AudioQualityLevel)
    ? (value as AudioQualityLevel)
    : defaultConfig.downloadQuality
}

/** 归一化下载音质策略。 */
export function normalizeDownloadQualityPolicy(value: unknown) {
  return typeof value === 'string' &&
    DOWNLOAD_QUALITY_POLICIES.includes(value as DownloadQualityPolicy)
    ? (value as DownloadQualityPolicy)
    : defaultConfig.downloadQualityPolicy
}

/** 归一化跳过已有文件开关。 */
export function normalizeDownloadSkipExisting(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.downloadSkipExisting
}

/** 归一化下载目录，空字符串表示使用系统默认下载目录。 */
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

/** 归一化下载并发，限制在 1-10 之间。 */
export function normalizeDownloadConcurrency(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return defaultConfig.downloadConcurrency
  }

  return Math.min(10, Math.max(1, Math.floor(value)))
}

/** 归一化内置增强音源模块列表，过滤未知值并去重。 */
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

/** 归一化下载文件命名模板。 */
export function normalizeDownloadFileNamePattern(value: unknown) {
  return typeof value === 'string' &&
    DOWNLOAD_FILE_NAME_PATTERNS.includes(value as DownloadFileNamePattern)
    ? (value as DownloadFileNamePattern)
    : defaultConfig.downloadFileNamePattern
}

/** 归一化下载嵌入封面开关。 */
export function normalizeDownloadEmbedCover(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.downloadEmbedCover
}

/** 归一化下载嵌入歌词开关。 */
export function normalizeDownloadEmbedLyrics(value: unknown) {
  return typeof value === 'boolean' ? value : defaultConfig.downloadEmbedLyrics
}

/** 翻译歌词依赖原文歌词嵌入，关闭原文时强制关闭翻译歌词。 */
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

/** 配置 IPC 通道复导出，兼容旧代码从 config.ts 读取通道的用法。 */
export { IPC_CHANNELS }
