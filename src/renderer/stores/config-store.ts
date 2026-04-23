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
  normalizeRetroCoverPreset,
  normalizePlaybackFadeEnabled,
  normalizeLyricsKaraokeEnabled,
  normalizePlaybackSpeed,
  normalizePlayerBackgroundMode,
  normalizeRememberPlaybackSession,
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
  config: defaultConfig,
  isLoading: true,

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
