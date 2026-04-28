import assert from 'node:assert/strict'
import test from 'node:test'

import { createCacheIpc } from '../src/main/ipc/cache-ipc.ts'
import { CACHE_IPC_CHANNELS } from '../src/main/cache/cache-types.ts'

test('createCacheIpc registers handlers and resolves the system cache directory lazily', async () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>()
  const selectedWindow = { id: 'cache-window' }
  let appGetPathCalls = 0

  const cacheService = {
    getDefaultCacheRoot: () =>
      'C:\\Users\\tester\\AppData\\Roaming\\AuralMusic',
    resolveCacheRoot: (cacheDir?: string) =>
      cacheDir || 'C:\\Users\\tester\\AppData\\Roaming\\AuralMusic',
    getStatus: async () => ({
      usedBytes: 0,
      audioCount: 0,
      lyricsCount: 0,
    }),
    clear: async () => undefined,
    resolveAudioSource: async () => ({
      url: 'https://cdn.example.com/song.mp3',
      fromCache: false,
    }),
    resolveImageSource: async () => ({
      url: 'file:///C:/cache/image.webp',
      fromCache: true,
    }),
    readLyricsPayload: async () => null,
    writeLyricsPayload: async () => undefined,
  }

  createCacheIpc({
    ipcMain: {
      handle: (channel, handler) => {
        handlers.set(channel, handler)
      },
    },
    browserWindowFromWebContents: () => selectedWindow,
    dialog: {
      showOpenDialog: async (window, options) => {
        assert.equal(window, selectedWindow)
        assert.equal(
          options.defaultPath,
          'C:\\Users\\tester\\AppData\\Roaming\\AuralMusic'
        )
        return {
          canceled: false,
          filePaths: ['D:\\cache'],
        }
      },
    },
    appGetPath: name => {
      appGetPathCalls += 1
      assert.equal(name, 'sessionData')
      return 'C:\\Users\\tester\\AppData\\Roaming'
    },
    getConfigValue: key => {
      if (key === 'diskCacheDir') {
        return ''
      }
      if (key === 'diskCacheEnabled') {
        return true
      }
      if (key === 'diskCacheMaxBytes') {
        return 1024
      }
      throw new Error(`Unexpected config key: ${String(key)}`)
    },
    cacheService,
  }).register()

  assert.equal(appGetPathCalls, 0)
  assert.equal(
    await handlers.get(CACHE_IPC_CHANNELS.GET_DEFAULT_DIRECTORY)?.(),
    'C:\\Users\\tester\\AppData\\Roaming\\AuralMusic'
  )
  assert.equal(appGetPathCalls, 0)
  assert.equal(
    await handlers.get(CACHE_IPC_CHANNELS.SELECT_DIRECTORY)?.({
      sender: {},
    }),
    'D:\\cache'
  )
  assert.deepEqual(
    await handlers.get(CACHE_IPC_CHANNELS.RESOLVE_IMAGE_SOURCE)?.(
      {},
      'artist:detail:hero:7',
      'https://img.example.com/7.jpg'
    ),
    {
      url: 'file:///C:/cache/image.webp',
      fromCache: true,
    }
  )
})

test('createCacheIpc routes forced audio cache resolution to playback temp cache', async () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>()
  const resolveAudioCalls: unknown[] = []
  const tempResolveAudioCalls: unknown[] = []

  const cacheService = {
    getDefaultCacheRoot: () =>
      'C:\\Users\\tester\\AppData\\Roaming\\AuralMusic',
    resolveCacheRoot: (cacheDir?: string) =>
      cacheDir || 'C:\\Users\\tester\\AppData\\Roaming\\AuralMusic',
    getStatus: async () => ({
      usedBytes: 0,
      audioCount: 0,
      lyricsCount: 0,
    }),
    clear: async () => undefined,
    resolveAudioSource: async (params: unknown) => {
      resolveAudioCalls.push(params)
      return {
        url: 'auralmusic-media://local-file?path=C%3A%5Ccache%5Csong.mp3',
        fromCache: true,
      }
    },
    resolveImageSource: async () => ({
      url: 'file:///C:/cache/image.webp',
      fromCache: true,
    }),
    readLyricsPayload: async () => null,
    writeLyricsPayload: async () => undefined,
  }
  const playbackTempCacheService = {
    getDefaultTempRoot: () =>
      'C:\\Users\\tester\\AppData\\Roaming\\AuralMusic\\playback-temp',
    clear: async () => undefined,
    resolveAudioSource: async (params: unknown) => {
      tempResolveAudioCalls.push(params)
      return {
        url: 'auralmusic-media://local-file?path=C%3A%5Ctemp%5Csong.mp3',
        fromCache: true,
      }
    },
  }

  createCacheIpc({
    ipcMain: {
      handle: (channel, handler) => {
        handlers.set(channel, handler)
      },
    },
    cacheService,
    playbackTempCacheService,
    getConfigValue: key => {
      if (key === 'diskCacheDir') {
        return ''
      }
      if (key === 'diskCacheEnabled') {
        return false
      }
      if (key === 'diskCacheMaxBytes') {
        return 1024
      }
      throw new Error(`Unexpected config key: ${String(key)}`)
    },
  }).register()

  await handlers.get(CACHE_IPC_CHANNELS.RESOLVE_AUDIO_SOURCE)?.(
    {},
    'song-1',
    'https://cdn.example.com/song.mp3',
    { force: true }
  )

  assert.deepEqual(resolveAudioCalls, [])
  assert.deepEqual(tempResolveAudioCalls, [
    {
      cacheKey: 'song-1',
      sourceUrl: 'https://cdn.example.com/song.mp3',
    },
  ])
})

test('createCacheIpc keeps forced audio in user cache when disk cache is enabled', async () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>()
  const resolveAudioCalls: unknown[] = []
  const tempResolveAudioCalls: unknown[] = []

  const cacheService = {
    getDefaultCacheRoot: () =>
      'C:\\Users\\tester\\AppData\\Roaming\\AuralMusic',
    resolveCacheRoot: (cacheDir?: string) =>
      cacheDir || 'C:\\Users\\tester\\AppData\\Roaming\\AuralMusic',
    getStatus: async () => ({
      usedBytes: 0,
      audioCount: 0,
      lyricsCount: 0,
    }),
    clear: async () => undefined,
    resolveAudioSource: async (params: unknown) => {
      resolveAudioCalls.push(params)
      return {
        url: 'auralmusic-media://local-file?path=C%3A%5Ccache%5Csong.mp3',
        fromCache: true,
      }
    },
    resolveImageSource: async () => ({
      url: 'file:///C:/cache/image.webp',
      fromCache: true,
    }),
    readLyricsPayload: async () => null,
    writeLyricsPayload: async () => undefined,
  }
  const playbackTempCacheService = {
    getDefaultTempRoot: () =>
      'C:\\Users\\tester\\AppData\\Roaming\\AuralMusic\\playback-temp',
    clear: async () => undefined,
    resolveAudioSource: async (params: unknown) => {
      tempResolveAudioCalls.push(params)
      return {
        url: 'auralmusic-media://local-file?path=C%3A%5Ctemp%5Csong.mp3',
        fromCache: true,
      }
    },
  }

  createCacheIpc({
    ipcMain: {
      handle: (channel, handler) => {
        handlers.set(channel, handler)
      },
    },
    cacheService,
    playbackTempCacheService,
    getConfigValue: key => {
      if (key === 'diskCacheDir') {
        return ''
      }
      if (key === 'diskCacheEnabled') {
        return true
      }
      if (key === 'diskCacheMaxBytes') {
        return 1024
      }
      throw new Error(`Unexpected config key: ${String(key)}`)
    },
  }).register()

  await handlers.get(CACHE_IPC_CHANNELS.RESOLVE_AUDIO_SOURCE)?.(
    {},
    'song-1',
    'https://cdn.example.com/song.mp3',
    { force: true }
  )

  assert.deepEqual(tempResolveAudioCalls, [])
  assert.deepEqual(resolveAudioCalls, [
    {
      cacheKey: 'song-1',
      sourceUrl: 'https://cdn.example.com/song.mp3',
      enabled: true,
      cacheDir: '',
      maxBytes: 1024,
    },
  ])
})
