import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveTrackWithLxMusicSource,
  type PlaybackTrack,
} from '../src/renderer/services/music-source/lx-playback-resolver.ts'
import { setLxMusicRunner } from '../src/renderer/services/music-source/LxMusicSourceRunner.ts'
import type { AppConfig } from '../src/main/config/types.ts'

function createTrack(): PlaybackTrack {
  return {
    id: 1001,
    name: 'LX Track',
    artistNames: 'LX Artist',
    albumName: 'LX Album',
    coverUrl: 'https://cdn.example.com/lx.jpg',
    duration: 180000,
  }
}

function createConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    theme: 'system',
    themeColor: null,
    fontFamily: 'Inter Variable',
    audioOutputDeviceId: 'default',
    playbackVolume: 70,
    playbackMode: 'repeat-all',
    playbackSpeed: 1,
    rememberPlaybackSession: false,
    dynamicCoverEnabled: true,
    retroCoverPreset: 'off',
    showLyricTranslation: false,
    lyricsKaraokeEnabled: true,
    musicSourceEnabled: true,
    musicSourceProviders: [],
    luoxueSourceEnabled: true,
    luoxueSourceUrl: '',
    luoxueMusicSourceScript: null,
    luoxueMusicSourceScripts: [
      {
        id: 'script-1',
        name: 'LX Script',
        fileName: 'script.js',
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    activeLuoxueMusicSourceScriptId: 'script-1',
    customMusicApiEnabled: false,
    customMusicApiUrl: '',
    quality: 'higher',
    globalShortcutEnabled: false,
    shortcutBindings: {
      playPause: 'CommandOrControl+Alt+P',
      nextTrack: 'CommandOrControl+Alt+Right',
      previousTrack: 'CommandOrControl+Alt+Left',
      likeTrack: 'CommandOrControl+Alt+L',
    },
    autoStartEnabled: false,
    closeBehavior: 'ask',
    rememberCloseChoice: false,
    playerBackgroundMode: 'static',
    diskCacheEnabled: false,
    diskCacheDir: '',
    diskCacheMaxBytes: 1024 * 1024 * 1024,
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
    ...overrides,
  }
}

test('resolveTrackWithLxMusicSource does not depend on deprecated musicSourceProviders', async () => {
  const originalWindow = globalThis.window
  let requestedSource: string | null = null
  const fakeRunner = {
    dispose: () => undefined,
    isInitialized: () => true,
    matchesScript: (script: string) => script === 'mock lx script',
    getSources: () => ({
      wy: {
        name: 'NetEase',
        type: 'music' as const,
        actions: ['musicUrl'] as const,
        qualitys: ['320k'] as const,
      },
      kw: {
        name: 'Kuwo',
        type: 'music' as const,
        actions: ['musicUrl'] as const,
        qualitys: ['320k'] as const,
      },
    }),
    getMusicUrl: async (source: string) => {
      requestedSource = source
      return 'https://cdn.example.com/from-lx.mp3'
    },
  }

  globalThis.window = {
    electronMusicSource: {
      readLxScript: async () => 'mock lx script',
    },
  } as typeof globalThis.window

  setLxMusicRunner(fakeRunner as never)

  try {
    const result = await resolveTrackWithLxMusicSource({
      track: createTrack(),
      quality: 'higher',
      config: createConfig(),
    })

    assert.deepEqual(result, {
      id: 1001,
      url: 'https://cdn.example.com/from-lx.mp3',
      time: 180000,
      br: 0,
    })
    assert.equal(requestedSource, 'wy')
  } finally {
    setLxMusicRunner(null)
    globalThis.window = originalWindow
  }
})
