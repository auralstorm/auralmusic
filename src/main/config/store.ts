import path from 'node:path'
import ElectronStore from 'electron-store'
import { resolveAppStoreDirectory } from '../storage/store-path.ts'
import {
  AUDIO_QUALITY_LEVELS,
  ANIMATION_EFFECT_LEVELS,
  DOWNLOAD_QUALITY_POLICIES,
  DOWNLOAD_FILE_NAME_PATTERNS,
  ENHANCED_SOURCE_MODULES,
  LOCAL_LIBRARY_SCAN_FORMATS,
  MUSIC_SOURCE_PROVIDERS,
  PLAYER_ARTWORK_STYLES,
  RETRO_COVER_PRESETS,
  defaultConfig,
  normalizeDiskCacheDir,
  normalizeDiskCacheEnabled,
  normalizeDiskCacheMaxBytes,
  normalizeDownloadConcurrency,
  normalizeDownloadDir,
  normalizeDownloadEmbedCover,
  normalizeDownloadEmbedLyrics,
  normalizeDownloadEmbedTranslatedLyrics,
  normalizeDownloadEnabled,
  normalizeDownloadFileNamePattern,
  normalizeDownloadQuality,
  normalizeDownloadQualityPolicy,
  normalizeDownloadSkipExisting,
  normalizeDynamicCoverEnabled,
  normalizeEnhancedSourceModules,
  normalizeEqualizerConfigValue,
  normalizeAnimationEffect,
  normalizeImmersivePlayerControls,
  normalizeLocalLibraryRoots,
  normalizeLocalLibraryOnlineLyricMatchEnabled,
  normalizeLocalLibraryScanFormats,
  normalizeRetroCoverPreset,
  normalizePlaybackFadeEnabled,
  normalizeLyricsKaraokeEnabled,
  normalizePlaybackSpeed,
  normalizePlayerArtworkStyle,
  normalizePlayerBackgroundMode,
  normalizeRememberPlaybackSession,
  normalizeShowLocalLibraryMenu,
  normalizeShowLyricTranslation,
} from './types.ts'
import type {
  AppConfig,
  AudioQualityLevel,
  MusicSourceProvider,
} from './types.ts'
import {
  normalizeImportedLxMusicSource,
  normalizeImportedLxMusicSources,
  resolveActiveLxMusicSourceScriptId,
} from '../../shared/lx-music-source.ts'
import { EQ_BANDS } from '../../shared/equalizer.ts'
import { normalizeShortcutBindings } from '../../shared/shortcut-keys.ts'
import {
  PLAYBACK_MODE_SEQUENCE,
  normalizePlaybackMode,
  normalizePlaybackVolume,
} from '../../shared/playback.ts'

const Store =
  (
    ElectronStore as typeof ElectronStore & {
      default?: typeof ElectronStore
    }
  ).default ?? ElectronStore

/** 识别旧版本默认下载目录，迁移时避免继续把文件写到项目源码目录下。 */
function isLegacyProjectDownloadsDir(value: string) {
  const normalizedValue = value.trim()
  if (!normalizedValue) {
    return false
  }

  const legacyProjectDownloadsDir = path.join(process.cwd(), 'downloads')
  return (
    path.resolve(normalizedValue) === path.resolve(legacyProjectDownloadsDir)
  )
}

/** 兼容历史 high 质量枚举，新版本统一映射到 higher。 */
function normalizeQuality(value: unknown): AudioQualityLevel {
  if (value === 'high') {
    return 'higher'
  }

  if (
    typeof value === 'string' &&
    AUDIO_QUALITY_LEVELS.includes(value as AudioQualityLevel)
  ) {
    return value as AudioQualityLevel
  }

  return defaultConfig.quality
}

/** 归一化启用的音源提供方，过滤未知值并去重。 */
function normalizeMusicSourceProviders(value: unknown): MusicSourceProvider[] {
  if (!Array.isArray(value)) {
    return defaultConfig.musicSourceProviders
  }

  return [
    ...new Set(
      value.filter((item): item is MusicSourceProvider => {
        return (
          typeof item === 'string' &&
          MUSIC_SOURCE_PROVIDERS.includes(item as MusicSourceProvider)
        )
      })
    ),
  ]
}

/** 判断 provider 列表是否和目标值一致，用于迁移时减少无意义写入。 */
function areProvidersEqual(
  left: unknown,
  right: MusicSourceProvider[]
): left is MusicSourceProvider[] {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  )
}

const CONFIG_STORE_SCHEMA = {
  theme: { type: 'string', enum: ['light', 'dark', 'system'] },
  themeColor: {
    anyOf: [{ type: 'string' }, { type: 'null' }],
  },
  fontFamily: { type: 'string' },
  audioOutputDeviceId: { type: 'string' },
  playbackVolume: { type: 'number', minimum: 0, maximum: 100 },
  playbackMode: { type: 'string', enum: PLAYBACK_MODE_SEQUENCE },
  playbackSpeed: { type: 'number', minimum: 0.5, maximum: 2 },
  equalizer: {
    type: 'object',
    properties: {
      enabled: { type: 'boolean' },
      presetId: { type: 'string' },
      preamp: { type: 'number', minimum: -12, maximum: 12 },
      bands: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            frequency: {
              type: 'number',
              enum: EQ_BANDS.map(band => band.frequency),
            },
            gain: { type: 'number', minimum: -12, maximum: 12 },
          },
          required: ['frequency', 'gain'],
        },
      },
    },
    required: ['enabled', 'presetId', 'preamp', 'bands'],
  },
  rememberPlaybackSession: { type: 'boolean' },
  dynamicCoverEnabled: { type: 'boolean' },
  retroCoverPreset: {
    type: 'string',
    enum: RETRO_COVER_PRESETS,
  },
  showLocalLibraryMenu: { type: 'boolean' },
  localLibraryRoots: {
    type: 'array',
    items: { type: 'string' },
  },
  localLibraryScanFormats: {
    type: 'array',
    items: { type: 'string', enum: LOCAL_LIBRARY_SCAN_FORMATS },
  },
  localLibraryOnlineLyricMatchEnabled: { type: 'boolean' },
  showLyricTranslation: { type: 'boolean' },
  lyricsKaraokeEnabled: { type: 'boolean' },
  musicSourceEnabled: { type: 'boolean' },
  musicSourceProviders: {
    type: 'array',
    items: { type: 'string', enum: MUSIC_SOURCE_PROVIDERS },
  },
  enhancedSourceModules: {
    type: 'array',
    items: { type: 'string', enum: ENHANCED_SOURCE_MODULES },
  },
  luoxueSourceEnabled: { type: 'boolean' },
  luoxueSourceUrl: { type: 'string' },
  luoxueMusicSourceScript: {
    anyOf: [
      { type: 'null' },
      {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          fileName: { type: 'string' },
          description: { type: 'string' },
          version: { type: 'string' },
          author: { type: 'string' },
          homepage: { type: 'string' },
          createdAt: { type: 'number' },
          updatedAt: { type: 'number' },
        },
        required: ['id', 'name', 'fileName', 'createdAt', 'updatedAt'],
      },
    ],
  },
  luoxueMusicSourceScripts: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        fileName: { type: 'string' },
        sources: {
          type: 'array',
          items: { type: 'string' },
        },
        description: { type: 'string' },
        version: { type: 'string' },
        author: { type: 'string' },
        homepage: { type: 'string' },
        createdAt: { type: 'number' },
        updatedAt: { type: 'number' },
      },
      required: ['id', 'name', 'fileName', 'createdAt', 'updatedAt'],
    },
  },
  activeLuoxueMusicSourceScriptId: {
    anyOf: [{ type: 'string' }, { type: 'null' }],
  },
  customMusicApiEnabled: { type: 'boolean' },
  customMusicApiUrl: { type: 'string' },
  quality: { type: 'string', enum: AUDIO_QUALITY_LEVELS },
  globalShortcutEnabled: { type: 'boolean' },
  shortcutBindings: { type: 'object' },
  autoStartEnabled: { type: 'boolean' },
  closeBehavior: { type: 'string', enum: ['ask', 'minimize', 'quit'] },
  rememberCloseChoice: { type: 'boolean' },
  playerBackgroundMode: {
    type: 'string',
    enum: ['off', 'static', 'dynamic'],
  },
  playerArtworkStyle: {
    type: 'string',
    enum: PLAYER_ARTWORK_STYLES,
  },
  animationEffect: {
    type: 'string',
    enum: ANIMATION_EFFECT_LEVELS,
  },
  immersivePlayerControls: { type: 'boolean' },
  playbackFadeEnabled: { type: 'boolean' },
  diskCacheEnabled: { type: 'boolean' },
  diskCacheDir: { type: 'string' },
  diskCacheMaxBytes: { type: 'number', minimum: 1 },
  downloadEnabled: { type: 'boolean' },
  downloadQuality: { type: 'string', enum: AUDIO_QUALITY_LEVELS },
  downloadQualityPolicy: {
    type: 'string',
    enum: DOWNLOAD_QUALITY_POLICIES,
  },
  downloadSkipExisting: { type: 'boolean' },
  downloadDir: { type: 'string' },
  downloadConcurrency: { type: 'number', minimum: 1, maximum: 10 },
  downloadFileNamePattern: {
    type: 'string',
    enum: DOWNLOAD_FILE_NAME_PATTERNS,
  },
  downloadEmbedCover: { type: 'boolean' },
  downloadEmbedLyrics: { type: 'boolean' },
  downloadEmbedTranslatedLyrics: { type: 'boolean' },
} satisfies ConstructorParameters<typeof Store<AppConfig>>[0]['schema']

/** 构建配置存储选项，包含默认值和 schema 校验。 */
export function buildConfigStoreOptions(
  resolveStoreDirectory: () => string = resolveAppStoreDirectory
) {
  return {
    cwd: resolveStoreDirectory(),
    name: 'aural-music-config',
    defaults: defaultConfig,
    schema: CONFIG_STORE_SCHEMA,
  }
}

function createConfigStore() {
  return new Store<AppConfig>(buildConfigStoreOptions())
}

/** 配置 store 单例，避免多个 electron-store 实例同时读写同一个配置文件。 */
class ConfigStore {
  private static instance: ReturnType<typeof createConfigStore>

  private constructor() {}

  public static getInstance(): ReturnType<typeof createConfigStore> {
    if (!ConfigStore.instance) {
      ConfigStore.instance = createConfigStore()

      // 历史配置和外部手改配置在首次读取 store 时集中归一化，保证运行期拿到稳定字段。
      const quality = ConfigStore.instance.get('quality')
      const normalizedQuality = normalizeQuality(quality)
      if (quality !== normalizedQuality) {
        ConfigStore.instance.set('quality', normalizedQuality)
      }

      const playbackVolume = ConfigStore.instance.get('playbackVolume')
      const normalizedPlaybackVolume = normalizePlaybackVolume(playbackVolume)
      if (playbackVolume !== normalizedPlaybackVolume) {
        ConfigStore.instance.set('playbackVolume', normalizedPlaybackVolume)
      }

      const playbackMode = ConfigStore.instance.get('playbackMode')
      const normalizedMode = normalizePlaybackMode(playbackMode)
      if (playbackMode !== normalizedMode) {
        ConfigStore.instance.set('playbackMode', normalizedMode)
      }

      const playbackSpeed = ConfigStore.instance.get('playbackSpeed')
      const normalizedPlaybackSpeed = normalizePlaybackSpeed(playbackSpeed)
      if (playbackSpeed !== normalizedPlaybackSpeed) {
        ConfigStore.instance.set('playbackSpeed', normalizedPlaybackSpeed)
      }

      const equalizer = ConfigStore.instance.get('equalizer')
      const normalizedEqualizer = normalizeEqualizerConfigValue(equalizer)
      if (JSON.stringify(equalizer) !== JSON.stringify(normalizedEqualizer)) {
        ConfigStore.instance.set('equalizer', normalizedEqualizer)
      }

      const rememberPlaybackSession = ConfigStore.instance.get(
        'rememberPlaybackSession'
      )
      const normalizedRememberPlaybackSession =
        normalizeRememberPlaybackSession(rememberPlaybackSession)
      if (rememberPlaybackSession !== normalizedRememberPlaybackSession) {
        ConfigStore.instance.set(
          'rememberPlaybackSession',
          normalizedRememberPlaybackSession
        )
      }

      const dynamicCoverEnabled = ConfigStore.instance.get(
        'dynamicCoverEnabled'
      )
      const normalizedDynamicCoverEnabled =
        normalizeDynamicCoverEnabled(dynamicCoverEnabled)
      if (dynamicCoverEnabled !== normalizedDynamicCoverEnabled) {
        ConfigStore.instance.set(
          'dynamicCoverEnabled',
          normalizedDynamicCoverEnabled
        )
      }

      const retroCoverPreset = ConfigStore.instance.get('retroCoverPreset')
      const normalizedRetroCoverPreset =
        normalizeRetroCoverPreset(retroCoverPreset)
      if (retroCoverPreset !== normalizedRetroCoverPreset) {
        ConfigStore.instance.set('retroCoverPreset', normalizedRetroCoverPreset)
      }

      const showLocalLibraryMenu = ConfigStore.instance.get(
        'showLocalLibraryMenu'
      )
      const normalizedShowLocalLibraryMenu =
        normalizeShowLocalLibraryMenu(showLocalLibraryMenu)
      if (showLocalLibraryMenu !== normalizedShowLocalLibraryMenu) {
        ConfigStore.instance.set(
          'showLocalLibraryMenu',
          normalizedShowLocalLibraryMenu
        )
      }

      const localLibraryRoots = ConfigStore.instance.get('localLibraryRoots')
      const normalizedLocalLibraryRoots =
        normalizeLocalLibraryRoots(localLibraryRoots)
      if (
        JSON.stringify(localLibraryRoots) !==
        JSON.stringify(normalizedLocalLibraryRoots)
      ) {
        ConfigStore.instance.set(
          'localLibraryRoots',
          normalizedLocalLibraryRoots
        )
      }

      const localLibraryScanFormats = ConfigStore.instance.get(
        'localLibraryScanFormats'
      )
      const normalizedLocalLibraryScanFormats =
        normalizeLocalLibraryScanFormats(localLibraryScanFormats)
      if (
        JSON.stringify(localLibraryScanFormats) !==
        JSON.stringify(normalizedLocalLibraryScanFormats)
      ) {
        ConfigStore.instance.set(
          'localLibraryScanFormats',
          normalizedLocalLibraryScanFormats
        )
      }

      const localLibraryOnlineLyricMatchEnabled = ConfigStore.instance.get(
        'localLibraryOnlineLyricMatchEnabled'
      )
      const normalizedLocalLibraryOnlineLyricMatchEnabled =
        normalizeLocalLibraryOnlineLyricMatchEnabled(
          localLibraryOnlineLyricMatchEnabled
        )
      if (
        localLibraryOnlineLyricMatchEnabled !==
        normalizedLocalLibraryOnlineLyricMatchEnabled
      ) {
        ConfigStore.instance.set(
          'localLibraryOnlineLyricMatchEnabled',
          normalizedLocalLibraryOnlineLyricMatchEnabled
        )
      }

      const playerBackgroundMode = ConfigStore.instance.get(
        'playerBackgroundMode'
      )
      const normalizedPlayerBackgroundMode =
        normalizePlayerBackgroundMode(playerBackgroundMode)
      if (playerBackgroundMode !== normalizedPlayerBackgroundMode) {
        ConfigStore.instance.set(
          'playerBackgroundMode',
          normalizedPlayerBackgroundMode
        )
      }

      const playerArtworkStyle = ConfigStore.instance.get('playerArtworkStyle')
      const normalizedPlayerArtworkStyle =
        normalizePlayerArtworkStyle(playerArtworkStyle)
      if (playerArtworkStyle !== normalizedPlayerArtworkStyle) {
        ConfigStore.instance.set(
          'playerArtworkStyle',
          normalizedPlayerArtworkStyle
        )
      }

      const animationEffect = ConfigStore.instance.get('animationEffect')
      const normalizedAnimationEffect =
        normalizeAnimationEffect(animationEffect)
      if (animationEffect !== normalizedAnimationEffect) {
        ConfigStore.instance.set('animationEffect', normalizedAnimationEffect)
      }

      const immersivePlayerControls = ConfigStore.instance.get(
        'immersivePlayerControls'
      )
      const normalizedImmersivePlayerControls =
        normalizeImmersivePlayerControls(immersivePlayerControls)
      if (immersivePlayerControls !== normalizedImmersivePlayerControls) {
        ConfigStore.instance.set(
          'immersivePlayerControls',
          normalizedImmersivePlayerControls
        )
      }

      const playbackFadeEnabled = ConfigStore.instance.get(
        'playbackFadeEnabled'
      )
      const normalizedPlaybackFadeEnabled =
        normalizePlaybackFadeEnabled(playbackFadeEnabled)
      if (playbackFadeEnabled !== normalizedPlaybackFadeEnabled) {
        ConfigStore.instance.set(
          'playbackFadeEnabled',
          normalizedPlaybackFadeEnabled
        )
      }

      const diskCacheMaxBytes = ConfigStore.instance.get('diskCacheMaxBytes')
      const normalizedDiskCacheMaxBytes =
        normalizeDiskCacheMaxBytes(diskCacheMaxBytes)
      if (diskCacheMaxBytes !== normalizedDiskCacheMaxBytes) {
        ConfigStore.instance.set(
          'diskCacheMaxBytes',
          normalizedDiskCacheMaxBytes
        )
      }

      const globalShortcutEnabled = ConfigStore.instance.get(
        'globalShortcutEnabled'
      )
      if (typeof globalShortcutEnabled !== 'boolean') {
        ConfigStore.instance.set(
          'globalShortcutEnabled',
          defaultConfig.globalShortcutEnabled
        )
      }

      const shortcutBindings = ConfigStore.instance.get('shortcutBindings')
      const normalizedShortcutBindings =
        normalizeShortcutBindings(shortcutBindings)
      if (
        JSON.stringify(shortcutBindings) !==
        JSON.stringify(normalizedShortcutBindings)
      ) {
        ConfigStore.instance.set('shortcutBindings', normalizedShortcutBindings)
      }

      const providers = ConfigStore.instance.get('musicSourceProviders')
      const normalizedProviders = normalizeMusicSourceProviders(providers)
      if (!areProvidersEqual(providers, normalizedProviders)) {
        ConfigStore.instance.set('musicSourceProviders', normalizedProviders)
      }

      const enhancedSourceModules = ConfigStore.instance.get(
        'enhancedSourceModules'
      )
      const normalizedEnhancedSourceModules = normalizeEnhancedSourceModules(
        enhancedSourceModules
      )
      if (
        JSON.stringify(enhancedSourceModules) !==
        JSON.stringify(normalizedEnhancedSourceModules)
      ) {
        ConfigStore.instance.set(
          'enhancedSourceModules',
          normalizedEnhancedSourceModules
        )
      }

      const lxScript = ConfigStore.instance.get('luoxueMusicSourceScript')
      const normalizedLxScript = normalizeImportedLxMusicSource(lxScript)
      if (lxScript !== normalizedLxScript) {
        ConfigStore.instance.set('luoxueMusicSourceScript', normalizedLxScript)
      }

      const lxScripts = ConfigStore.instance.get('luoxueMusicSourceScripts')
      const normalizedLxScripts = normalizeImportedLxMusicSources(
        lxScripts,
        normalizedLxScript
      )
      ConfigStore.instance.set('luoxueMusicSourceScripts', normalizedLxScripts)

      const activeLxScriptId = ConfigStore.instance.get(
        'activeLuoxueMusicSourceScriptId'
      )
      const normalizedActiveLxScriptId = resolveActiveLxMusicSourceScriptId(
        activeLxScriptId,
        normalizedLxScripts
      )
      if (activeLxScriptId !== normalizedActiveLxScriptId) {
        ConfigStore.instance.set(
          'activeLuoxueMusicSourceScriptId',
          normalizedActiveLxScriptId
        )
      }

      const showLyricTranslation = ConfigStore.instance.get(
        'showLyricTranslation'
      )
      const normalizedShowLyricTranslation =
        normalizeShowLyricTranslation(showLyricTranslation)
      if (showLyricTranslation !== normalizedShowLyricTranslation) {
        ConfigStore.instance.set(
          'showLyricTranslation',
          normalizedShowLyricTranslation
        )
      }

      const lyricsKaraokeEnabled = ConfigStore.instance.get(
        'lyricsKaraokeEnabled'
      )
      const normalizedLyricsKaraokeEnabled =
        normalizeLyricsKaraokeEnabled(lyricsKaraokeEnabled)
      if (lyricsKaraokeEnabled !== normalizedLyricsKaraokeEnabled) {
        ConfigStore.instance.set(
          'lyricsKaraokeEnabled',
          normalizedLyricsKaraokeEnabled
        )
      }

      const diskCacheEnabled = ConfigStore.instance.get('diskCacheEnabled')
      const normalizedDiskCacheEnabled =
        normalizeDiskCacheEnabled(diskCacheEnabled)
      if (diskCacheEnabled !== normalizedDiskCacheEnabled) {
        ConfigStore.instance.set('diskCacheEnabled', normalizedDiskCacheEnabled)
      }

      const diskCacheDir = ConfigStore.instance.get('diskCacheDir')
      const normalizedDiskCacheDir = normalizeDiskCacheDir(diskCacheDir)
      if (diskCacheDir !== normalizedDiskCacheDir) {
        ConfigStore.instance.set('diskCacheDir', normalizedDiskCacheDir)
      }

      const downloadEnabled = ConfigStore.instance.get('downloadEnabled')
      const normalizedDownloadEnabled =
        normalizeDownloadEnabled(downloadEnabled)
      if (downloadEnabled !== normalizedDownloadEnabled) {
        ConfigStore.instance.set('downloadEnabled', normalizedDownloadEnabled)
      }

      const downloadQuality = ConfigStore.instance.get('downloadQuality')
      const normalizedDownloadQuality =
        normalizeDownloadQuality(downloadQuality)
      if (downloadQuality !== normalizedDownloadQuality) {
        ConfigStore.instance.set('downloadQuality', normalizedDownloadQuality)
      }

      const downloadQualityPolicy = ConfigStore.instance.get(
        'downloadQualityPolicy'
      )
      const normalizedDownloadQualityPolicy = normalizeDownloadQualityPolicy(
        downloadQualityPolicy
      )
      if (downloadQualityPolicy !== normalizedDownloadQualityPolicy) {
        ConfigStore.instance.set(
          'downloadQualityPolicy',
          normalizedDownloadQualityPolicy
        )
      }

      const downloadSkipExisting = ConfigStore.instance.get(
        'downloadSkipExisting'
      )
      const normalizedDownloadSkipExisting =
        normalizeDownloadSkipExisting(downloadSkipExisting)
      if (downloadSkipExisting !== normalizedDownloadSkipExisting) {
        ConfigStore.instance.set(
          'downloadSkipExisting',
          normalizedDownloadSkipExisting
        )
      }

      const downloadDir = ConfigStore.instance.get('downloadDir')
      const normalizedDownloadDir = isLegacyProjectDownloadsDir(downloadDir)
        ? defaultConfig.downloadDir
        : normalizeDownloadDir(downloadDir)
      if (downloadDir !== normalizedDownloadDir) {
        ConfigStore.instance.set('downloadDir', normalizedDownloadDir)
      }

      const downloadConcurrency = ConfigStore.instance.get(
        'downloadConcurrency'
      )
      const normalizedDownloadConcurrency =
        normalizeDownloadConcurrency(downloadConcurrency)
      if (downloadConcurrency !== normalizedDownloadConcurrency) {
        ConfigStore.instance.set(
          'downloadConcurrency',
          normalizedDownloadConcurrency
        )
      }

      const downloadFileNamePattern = ConfigStore.instance.get(
        'downloadFileNamePattern'
      )
      const normalizedDownloadFileNamePattern =
        normalizeDownloadFileNamePattern(downloadFileNamePattern)
      if (downloadFileNamePattern !== normalizedDownloadFileNamePattern) {
        ConfigStore.instance.set(
          'downloadFileNamePattern',
          normalizedDownloadFileNamePattern
        )
      }

      const downloadEmbedCover = ConfigStore.instance.get('downloadEmbedCover')
      const normalizedDownloadEmbedCover =
        normalizeDownloadEmbedCover(downloadEmbedCover)
      if (downloadEmbedCover !== normalizedDownloadEmbedCover) {
        ConfigStore.instance.set(
          'downloadEmbedCover',
          normalizedDownloadEmbedCover
        )
      }

      const downloadEmbedLyrics = ConfigStore.instance.get(
        'downloadEmbedLyrics'
      )
      const normalizedDownloadEmbedLyrics =
        normalizeDownloadEmbedLyrics(downloadEmbedLyrics)
      if (downloadEmbedLyrics !== normalizedDownloadEmbedLyrics) {
        ConfigStore.instance.set(
          'downloadEmbedLyrics',
          normalizedDownloadEmbedLyrics
        )
      }

      const downloadEmbedTranslatedLyrics = ConfigStore.instance.get(
        'downloadEmbedTranslatedLyrics'
      )
      const normalizedDownloadEmbedTranslatedLyrics =
        normalizeDownloadEmbedTranslatedLyrics(
          downloadEmbedTranslatedLyrics,
          normalizedDownloadEmbedLyrics
        )
      if (
        downloadEmbedTranslatedLyrics !==
        normalizedDownloadEmbedTranslatedLyrics
      ) {
        ConfigStore.instance.set(
          'downloadEmbedTranslatedLyrics',
          normalizedDownloadEmbedTranslatedLyrics
        )
      }
    }

    return ConfigStore.instance
  }
}

function getConfigStore() {
  return ConfigStore.getInstance()
}

/** 按 key 读取配置值，返回类型由 AppConfig 对应字段推导。 */
export const getConfig = <K extends keyof AppConfig>(key: K): AppConfig[K] => {
  return getConfigStore().get(key)
}

/** 写入单个配置项，具体副作用由 config IPC 注册层处理。 */
export const setConfig = <K extends keyof AppConfig>(
  key: K,
  value: AppConfig[K]
): void => {
  getConfigStore().set(key, value)
}

/** 重置全部配置到默认值，调用方需要同步处理主题/快捷键等运行时副作用。 */
export const resetConfig = (): void => {
  getConfigStore().reset()
}
