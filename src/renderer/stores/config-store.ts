import { create } from 'zustand'
import {
  AUDIO_QUALITY_LEVELS,
  MUSIC_SOURCE_PROVIDERS,
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
  normalizeDownloadSkipExisting,
  normalizeDynamicCoverEnabled,
  normalizeLyricsKaraokeEnabled,
  normalizePlaybackSpeed,
  normalizePlayerBackgroundMode,
  normalizeRememberPlaybackSession,
  normalizeShowLyricTranslation,
  type AppConfig,
  type AudioQualityLevel,
  type MusicSourceProvider,
} from '../../main/config/types.ts'
import {
  normalizeImportedLxMusicSource,
  normalizeImportedLxMusicSources,
  resolveActiveLxMusicSourceScriptId,
} from '../../shared/lx-music-source.ts'
import { normalizeShortcutBindings } from '../../shared/shortcut-keys.ts'
import {
  normalizePlaybackMode,
  normalizePlaybackVolume,
} from '../../shared/playback.ts'
import { normalizeThemeColor } from '../theme/theme-color.ts'

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

function normalizeMusicSourceProviders(value: unknown): MusicSourceProvider[] {
  if (!Array.isArray(value)) {
    return defaultConfig.musicSourceProviders
  }

  const providers = value.filter((item): item is MusicSourceProvider => {
    return (
      typeof item === 'string' &&
      MUSIC_SOURCE_PROVIDERS.includes(item as MusicSourceProvider)
    )
  })

  return providers.length ? providers : defaultConfig.musicSourceProviders
}

function normalizeProvidersForLxState(
  providers: MusicSourceProvider[],
  activeLxScriptId: string | null
) {
  if (activeLxScriptId) {
    return providers
  }

  const normalizedProviders = providers.filter(
    provider => provider !== 'lxMusic'
  )

  return normalizedProviders.length
    ? normalizedProviders
    : defaultConfig.musicSourceProviders
}

function normalizeConfig(config: AppConfig): AppConfig {
  const luoxueMusicSourceScript = normalizeImportedLxMusicSource(
    config.luoxueMusicSourceScript
  )
  const luoxueMusicSourceScripts = normalizeImportedLxMusicSources(
    config.luoxueMusicSourceScripts,
    luoxueMusicSourceScript
  )
  const activeLuoxueMusicSourceScriptId = resolveActiveLxMusicSourceScriptId(
    config.activeLuoxueMusicSourceScriptId,
    luoxueMusicSourceScripts
  )
  const musicSourceProviders = normalizeProvidersForLxState(
    normalizeMusicSourceProviders(config.musicSourceProviders),
    activeLuoxueMusicSourceScriptId
  )

  return {
    ...defaultConfig,
    ...config,
    themeColor: normalizeThemeColor(config.themeColor),
    quality: normalizeQuality(config.quality),
    playbackVolume: normalizePlaybackVolume(config.playbackVolume),
    playbackMode: normalizePlaybackMode(config.playbackMode),
    playbackSpeed: normalizePlaybackSpeed(config.playbackSpeed),
    rememberPlaybackSession: normalizeRememberPlaybackSession(
      config.rememberPlaybackSession
    ),
    dynamicCoverEnabled: normalizeDynamicCoverEnabled(
      config.dynamicCoverEnabled
    ),
    showLyricTranslation: normalizeShowLyricTranslation(
      config.showLyricTranslation
    ),
    lyricsKaraokeEnabled: normalizeLyricsKaraokeEnabled(
      config.lyricsKaraokeEnabled
    ),
    musicSourceEnabled:
      typeof config.musicSourceEnabled === 'boolean'
        ? config.musicSourceEnabled
        : defaultConfig.musicSourceEnabled,
    musicSourceProviders,
    luoxueSourceEnabled:
      typeof config.luoxueSourceEnabled === 'boolean'
        ? config.luoxueSourceEnabled
        : defaultConfig.luoxueSourceEnabled,
    luoxueSourceUrl:
      typeof config.luoxueSourceUrl === 'string'
        ? config.luoxueSourceUrl
        : defaultConfig.luoxueSourceUrl,
    luoxueMusicSourceScript,
    luoxueMusicSourceScripts,
    activeLuoxueMusicSourceScriptId,
    customMusicApiEnabled:
      typeof config.customMusicApiEnabled === 'boolean'
        ? config.customMusicApiEnabled
        : defaultConfig.customMusicApiEnabled,
    customMusicApiUrl:
      typeof config.customMusicApiUrl === 'string'
        ? config.customMusicApiUrl
        : defaultConfig.customMusicApiUrl,
    globalShortcutEnabled:
      typeof config.globalShortcutEnabled === 'boolean'
        ? config.globalShortcutEnabled
        : defaultConfig.globalShortcutEnabled,
    shortcutBindings: normalizeShortcutBindings(config.shortcutBindings),
    autoStartEnabled:
      typeof config.autoStartEnabled === 'boolean'
        ? config.autoStartEnabled
        : defaultConfig.autoStartEnabled,
    playerBackgroundMode: normalizePlayerBackgroundMode(
      config.playerBackgroundMode
    ),
    closeBehavior: ['ask', 'minimize', 'quit'].includes(config.closeBehavior)
      ? config.closeBehavior
      : defaultConfig.closeBehavior,
    rememberCloseChoice:
      typeof config.rememberCloseChoice === 'boolean'
        ? config.rememberCloseChoice
        : defaultConfig.rememberCloseChoice,
    diskCacheEnabled: normalizeDiskCacheEnabled(config.diskCacheEnabled),
    diskCacheDir: normalizeDiskCacheDir(config.diskCacheDir),
    diskCacheMaxBytes: normalizeDiskCacheMaxBytes(config.diskCacheMaxBytes),
    downloadEnabled: normalizeDownloadEnabled(config.downloadEnabled),
    downloadQuality: normalizeDownloadQuality(config.downloadQuality),
    downloadSkipExisting: normalizeDownloadSkipExisting(
      config.downloadSkipExisting
    ),
    downloadDir: normalizeDownloadDir(config.downloadDir),
    downloadConcurrency: normalizeDownloadConcurrency(
      config.downloadConcurrency
    ),
    downloadFileNamePattern: normalizeDownloadFileNamePattern(
      config.downloadFileNamePattern
    ),
    downloadEmbedCover: normalizeDownloadEmbedCover(config.downloadEmbedCover),
    downloadEmbedLyrics: normalizeDownloadEmbedLyrics(
      config.downloadEmbedLyrics
    ),
    downloadEmbedTranslatedLyrics: normalizeDownloadEmbedTranslatedLyrics(
      config.downloadEmbedTranslatedLyrics,
      normalizeDownloadEmbedLyrics(config.downloadEmbedLyrics)
    ),
  }
}

// 定义 Store 状态类型
interface ConfigStoreState {
  // 配置状态（全局共享）
  config: AppConfig
  // 加载状态（避免组件渲染时用默认值）
  isLoading: boolean

  // 动作 Action
  initConfig: () => Promise<void> // 初始化：从本地读取配置
  setConfig: <K extends keyof AppConfig>(
    key: K,
    value: AppConfig[K]
  ) => Promise<void>
  resetConfig: () => Promise<void> // 重置为默认配置
}

// 创建 Zustand Store
export const useConfigStore = create<ConfigStoreState>((set, get) => ({
  // 初始状态（用默认值兜底，加载完成后覆盖）
  config: defaultConfig,
  isLoading: true,

  // 1. 初始化：应用启动时从主进程拉取持久化配置
  initConfig: async () => {
    try {
      set({ isLoading: true })
      // 批量读取所有配置项
      const configKeys = Object.keys(defaultConfig) as (keyof AppConfig)[]
      const loadedConfigEntries = await Promise.all(
        configKeys.map(async key => [
          key,
          await window.electronConfig.getConfig(key),
        ])
      )
      const loadedConfig = Object.fromEntries(loadedConfigEntries) as AppConfig
      const normalizedConfig = normalizeConfig(loadedConfig)

      // 更新 Zustand 全局状态
      set({ config: normalizedConfig })
    } catch (err) {
      console.error('❌ 配置初始化失败:', err)
      // 出错时保持默认值，避免应用崩溃
    } finally {
      set({ isLoading: false })
    }
  },

  // 2. 修改配置：同步更新 Zustand 状态 + 持久化到本地
  setConfig: async (key, value) => {
    const currentConfig = get().config
    const newConfig = { ...currentConfig, [key]: value }

    // 第一步：更新内存状态（Zustand，所有组件实时响应）
    set({ config: newConfig })

    // 第二步：同步持久化到本地（electron-store，重启不丢失）
    try {
      await window.electronConfig.setConfig(key, value)
    } catch (err) {
      console.error('❌ 配置保存失败:', err)
      // 出错时回滚状态，保证数据一致性
      set({ config: currentConfig })
    }
  },

  // 3. 重置所有配置为默认值
  resetConfig: async () => {
    set({ config: defaultConfig, isLoading: true })
    try {
      await window.electronConfig.resetConfig()
    } catch (err) {
      console.error('❌ 配置重置失败:', err)
    } finally {
      set({ isLoading: false })
    }
  },
}))
