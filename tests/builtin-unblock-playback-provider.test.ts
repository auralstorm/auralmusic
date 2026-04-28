import assert from 'node:assert/strict'
import test from 'node:test'

import { createBuiltinUnblockPlaybackProvider } from '../src/renderer/services/music-source/providers/builtin-unblock-playback-provider.ts'

function createOptions() {
  return {
    track: {
      id: 22494904,
      name: 'Unlocked Song',
      artistNames: 'Unlocked Artist',
      albumName: 'Unlocked Album',
      coverUrl: '',
      duration: 180000,
    },
    context: {
      scene: 'playback' as const,
      isAuthenticated: false,
      isVip: false,
      trackFee: 0,
      config: {
        musicSourceEnabled: true,
        musicSourceProviders: [],
        enhancedSourceModules: ['unm', 'bikonoo', 'gdmusic', 'msls', 'qijieya'],
        luoxueSourceEnabled: false,
        customMusicApiEnabled: false,
        customMusicApiUrl: '',
        quality: 'higher' as const,
      },
    },
    policy: {
      resolverOrder: ['builtinUnblock'] as const,
      builtinPlatforms: [],
    },
    config: {
      musicSourceEnabled: true,
      musicSourceProviders: [],
      enhancedSourceModules: ['unm', 'bikonoo', 'gdmusic', 'msls', 'qijieya'],
      luoxueSourceEnabled: false,
      customMusicApiEnabled: false,
      customMusicApiUrl: '',
      quality: 'higher' as const,
    },
  }
}

test('builtin unblock playback provider tries explicit match sources in order and stops on first hit', async () => {
  const calls: string[] = []
  const provider = createBuiltinUnblockPlaybackProvider({
    getSongUrlMatch: async params => {
      calls.push(params.source)

      if (params.source === 'unm') {
        return { data: { code: 500, data: [] } }
      }

      if (params.source === 'bikonoo') {
        return {
          data: {
            code: 200,
            data: 'https://cdn.example.com/from-bikonoo.flac',
          },
        }
      }

      throw new Error(`unexpected source: ${params.source}`)
    },
  })

  const result = await provider.resolve(createOptions())

  assert.deepEqual(result, {
    id: 22494904,
    url: 'https://cdn.example.com/from-bikonoo.flac',
    time: 180000,
    br: 0,
  })
  assert.deepEqual(calls, ['unm', 'bikonoo'])
})

test('builtin unblock playback provider skips baka and returns null when explicit match sources all fail', async () => {
  const calls: string[] = []
  const provider = createBuiltinUnblockPlaybackProvider({
    getSongUrlMatch: async params => {
      calls.push(params.source)
      return { data: { code: 500, data: [] } }
    },
  })

  const result = await provider.resolve(createOptions())

  assert.equal(result, null)
  assert.deepEqual(calls, ['unm', 'bikonoo', 'gdmusic', 'msls', 'qijieya'])
})

test('builtin unblock playback provider uses configured enhanced source order from app config', async () => {
  const calls: string[] = []
  const provider = createBuiltinUnblockPlaybackProvider({
    getSongUrlMatch: async params => {
      calls.push(params.source)

      return params.source === 'gdmusic'
        ? {
            data: {
              code: 200,
              data: 'https://cdn.example.com/from-gdmusic.mp3',
            },
          }
        : { data: { code: 500, data: [] } }
    },
  })

  const result = await provider.resolve({
    ...createOptions(),
    config: {
      ...createOptions().config,
      enhancedSourceModules: ['bikonoo', 'gdmusic', 'baka'],
    },
  })

  assert.deepEqual(result, {
    id: 22494904,
    url: 'https://cdn.example.com/from-gdmusic.mp3',
    time: 180000,
    br: 0,
  })
  assert.deepEqual(calls, ['bikonoo', 'gdmusic'])
})

test('builtin unblock playback provider does not fall back to defaults when all enhanced modules are disabled', async () => {
  const calls: string[] = []
  const provider = createBuiltinUnblockPlaybackProvider({
    getSongUrlMatch: async params => {
      calls.push(params.source)
      throw new Error(`unexpected source: ${params.source}`)
    },
  })

  const result = await provider.resolve({
    ...createOptions(),
    config: {
      ...createOptions().config,
      enhancedSourceModules: [],
    },
  })

  assert.equal(result, null)
  assert.deepEqual(calls, [])
})
