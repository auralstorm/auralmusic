import { create } from 'zustand'
import {
  AUDIO_QUALITY_LEVELS,
  MUSIC_SOURCE_PROVIDERS,
  defaultConfig,
  normalizeAnimationEffect,
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
} from '../../shared/config.ts'
import type {
  AppConfig,
  AudioQualityLevel,
  MusicSourceProvider,
} from '../../shared/config.ts'
import {
  normalizeImportedLxMusicSource,
  normalizeImportedLxMusicSources,
  resolveActiveLxMusicSourceScriptId,
} from '../../shared/lx-music-source.ts'
import {
  normalizePlaybackMode,
  normalizePlaybackVolume,
} from '../../shared/playback.ts'
import { normalizeShortcutBindings } from '../../shared/shortcut-keys.ts'
import { normalizeThemeColor } from '../theme/theme-color.ts'
import type { ConfigStoreState } from '@/types/core'

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

function normalizeMusicSourceProviders(value: unknown) {
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
  const musicSourceProviders = normalizeMusicSourceProviders(
    config.musicSourceProviders
  )
  const enhancedSourceModules = normalizeEnhancedSourceModules(
    config.enhancedSourceModules
  )

  return {
    ...defaultConfig,
    ...config,
    themeColor: normalizeThemeColor(config.themeColor),
    quality: normalizeQuality(config.quality),
    playbackVolume: normalizePlaybackVolume(config.playbackVolume),
    playbackMode: normalizePlaybackMode(config.playbackMode),
    playbackSpeed: normalizePlaybackSpeed(config.playbackSpeed),
    equalizer: normalizeEqualizerConfigValue(config.equalizer),
    rememberPlaybackSession: normalizeRememberPlaybackSession(
      config.rememberPlaybackSession
    ),
    dynamicCoverEnabled: normalizeDynamicCoverEnabled(
      config.dynamicCoverEnabled
    ),
    retroCoverPreset: normalizeRetroCoverPreset(config.retroCoverPreset),
    showLocalLibraryMenu: normalizeShowLocalLibraryMenu(
      config.showLocalLibraryMenu
    ),
    localLibraryRoots: normalizeLocalLibraryRoots(config.localLibraryRoots),
    localLibraryScanFormats: normalizeLocalLibraryScanFormats(
      config.localLibraryScanFormats
    ),
    localLibraryOnlineLyricMatchEnabled:
      normalizeLocalLibraryOnlineLyricMatchEnabled(
        config.localLibraryOnlineLyricMatchEnabled
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
    enhancedSourceModules,
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
    playerArtworkStyle: normalizePlayerArtworkStyle(config.playerArtworkStyle),
    animationEffect: normalizeAnimationEffect(config.animationEffect),
    immersivePlayerControls: normalizeImmersivePlayerControls(
      config.immersivePlayerControls
    ),
    playbackFadeEnabled: normalizePlaybackFadeEnabled(
      config.playbackFadeEnabled
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
    downloadQualityPolicy: normalizeDownloadQualityPolicy(
      config.downloadQualityPolicy
    ),
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

export const useConfigStore = create<ConfigStoreState>((set, get) => ({
  // 当前应用配置快照，所有配置读取都以这份归一化结果为准。
  config: defaultConfig,
  // 配置初始化/重置加载态，避免页面在配置未就绪时读取脏默认值。
  isLoading: true,

  // 从主进程逐项读取配置并统一归一化，兼容旧版本配置字段。
  initConfig: async () => {
    try {
      set({ isLoading: true })
      const configKeys = Object.keys(defaultConfig) as (keyof AppConfig)[]
      const loadedConfigEntries = await Promise.all(
        configKeys.map(async key => [
          key,
          await window.electronConfig.getConfig(key),
        ])
      )
      const loadedConfig = Object.fromEntries(loadedConfigEntries) as AppConfig
      const normalizedConfig = normalizeConfig(loadedConfig)

      set({ config: normalizedConfig })
    } catch (err) {
      console.error('配置初始化失败', err)
    } finally {
      set({ isLoading: false })
    }
  },

  // 乐观更新单项配置；主进程写入失败时回滚到上一个配置快照。
  setConfig: async <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    const currentConfig = get().config
    const newConfig = { ...currentConfig, [key]: value }

    set({ config: newConfig })

    try {
      await window.electronConfig.setConfig(key, value)
    } catch (err) {
      console.error('配置保存失败', err)
      set({ config: currentConfig })
    }
  },

  // 重置主进程配置并让 renderer 回到默认配置快照。
  resetConfig: async () => {
    set({ config: defaultConfig, isLoading: true })
    try {
      await window.electronConfig.resetConfig()
    } catch (err) {
      console.error('配置重置失败', err)
    } finally {
      set({ isLoading: false })
    }
  },
}))
