import ElectronStore from 'electron-store'
import {
  AppConfig,
  AUDIO_QUALITY_LEVELS,
  MUSIC_SOURCE_PROVIDERS,
  defaultConfig,
  normalizeDiskCacheDir,
  normalizeDiskCacheEnabled,
  normalizeDiskCacheMaxBytes,
  normalizeDynamicCoverEnabled,
  normalizeLyricsKaraokeEnabled,
  normalizePlaybackSpeed,
  normalizePlayerBackgroundMode,
  normalizeShowLyricTranslation,
  type AudioQualityLevel,
  type MusicSourceProvider,
} from './types'
import {
  normalizeImportedLxMusicSource,
  normalizeImportedLxMusicSources,
  resolveActiveLxMusicSourceScriptId,
} from '../../shared/lx-music-source'
import { normalizeShortcutBindings } from '../../shared/shortcut-keys'
import {
  PLAYBACK_MODE_SEQUENCE,
  normalizePlaybackMode,
  normalizePlaybackVolume,
} from '../../shared/playback'

const Store =
  (
    ElectronStore as typeof ElectronStore & {
      default?: typeof ElectronStore
    }
  ).default ?? ElectronStore

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

function createConfigStore() {
  return new Store<AppConfig>({
    cwd: process.cwd(),
    name: 'aural-music-config',
    defaults: defaultConfig,
    schema: {
      theme: { type: 'string', enum: ['light', 'dark', 'system'] },
      fontFamily: { type: 'string' },
      audioOutputDeviceId: { type: 'string' },
      playbackVolume: { type: 'number', minimum: 0, maximum: 100 },
      playbackMode: { type: 'string', enum: PLAYBACK_MODE_SEQUENCE },
      playbackSpeed: { type: 'number', minimum: 0.5, maximum: 2 },
      dynamicCoverEnabled: { type: 'boolean' },
      showLyricTranslation: { type: 'boolean' },
      lyricsKaraokeEnabled: { type: 'boolean' },
      musicSourceEnabled: { type: 'boolean' },
      musicSourceProviders: {
        type: 'array',
        items: { type: 'string', enum: MUSIC_SOURCE_PROVIDERS },
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
      diskCacheEnabled: { type: 'boolean' },
      diskCacheDir: { type: 'string' },
      diskCacheMaxBytes: { type: 'number', minimum: 1 },
    },
  })
}

class ConfigStore {
  private static instance: ReturnType<typeof createConfigStore>

  private constructor() {}

  public static getInstance(): ReturnType<typeof createConfigStore> {
    if (!ConfigStore.instance) {
      ConfigStore.instance = createConfigStore()

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

      const normalizedLxAwareProviders = normalizeProvidersForLxState(
        normalizedProviders,
        normalizedActiveLxScriptId
      )
      if (!areProvidersEqual(providers, normalizedLxAwareProviders)) {
        ConfigStore.instance.set(
          'musicSourceProviders',
          normalizedLxAwareProviders
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
    }

    return ConfigStore.instance
  }
}

export const configStore = ConfigStore.getInstance()

export const getConfig = <K extends keyof AppConfig>(key: K): AppConfig[K] => {
  return configStore.get(key)
}

export const setConfig = <K extends keyof AppConfig>(
  key: K,
  value: AppConfig[K]
): void => {
  configStore.set(key, value)
}

export const resetConfig = (): void => {
  configStore.reset()
}
