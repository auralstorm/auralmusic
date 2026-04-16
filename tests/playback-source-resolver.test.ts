import assert from 'node:assert/strict'
import test from 'node:test'

import { createLxPlaybackProvider } from '../src/renderer/services/music-source/providers/lx-playback-provider.ts'
import type { SongUrlV1Result } from '../src/shared/playback.ts'
import { createPlaybackSourceResolver } from '../src/renderer/services/music-source/playback-source-resolver.ts'

type ProviderResult = SongUrlV1Result | null

function createTrack() {
  return {
    id: 1001,
    name: 'Policy Track',
    artistNames: 'Resolver Artist',
    albumName: 'Resolver Album',
    coverUrl: 'https://cdn.example.com/cover.jpg',
    duration: 180000,
  }
}

test('unauthenticated playback tries builtin and LX before official and stops on first success', async () => {
  const calls: string[] = []
  const track = createTrack()

  const resolvePlaybackSource = createPlaybackSourceResolver({
    getAuthState: () => ({
      user: null,
      session: null,
      loginStatus: 'anonymous',
    }),
    getConfig: () => ({
      quality: 'higher',
      musicSourceEnabled: true,
      musicSourceProviders: ['migu', 'lxMusic'],
      luoxueSourceEnabled: true,
      customMusicApiEnabled: false,
      customMusicApiUrl: '',
    }),
    providers: {
      builtinUnblock: {
        resolve: async options => {
          calls.push(`builtin:${options.policy.builtinPlatforms.join(',')}`)
          return null
        },
      },
      lxMusic: {
        resolve: async options => {
          calls.push(`lx:${options.context.config.quality}`)
          return {
            id: options.track.id,
            url: 'https://cdn.example.com/from-lx.flac',
            time: options.track.duration,
            br: 0,
          }
        },
      },
      official: {
        resolve: async () => {
          calls.push('official')
          return {
            id: track.id,
            url: 'https://cdn.example.com/from-official.mp3',
            time: track.duration,
            br: 320000,
          }
        },
      },
      customApi: {
        resolve: async () => {
          calls.push('custom')
          return null
        },
      },
    },
  })

  const result = await resolvePlaybackSource({ track })

  assert.deepEqual(result, {
    id: track.id,
    url: 'https://cdn.example.com/from-lx.flac',
    time: track.duration,
    br: 0,
  })
  assert.deepEqual(calls, ['builtin:migu', 'lx:higher'])
})

test('authenticated playback stops after official succeeds', async () => {
  const calls: string[] = []
  const track = createTrack()

  const resolvePlaybackSource = createPlaybackSourceResolver({
    getAuthState: () => ({
      user: { userId: 1, nickname: 'auth', avatarUrl: '' },
      session: {
        userId: 1,
        nickname: 'auth',
        avatarUrl: '',
        cookie: 'c',
        loginMethod: 'email',
        updatedAt: Date.now(),
      },
      loginStatus: 'authenticated',
    }),
    getConfig: () => ({
      quality: 'lossless',
      musicSourceEnabled: true,
      musicSourceProviders: ['migu', 'lxMusic'],
      luoxueSourceEnabled: true,
      customMusicApiEnabled: false,
      customMusicApiUrl: '',
    }),
    providers: {
      official: {
        resolve: async options => {
          calls.push(`official:${options.context.isAuthenticated}`)
          return {
            id: options.track.id,
            url: 'https://cdn.example.com/official.flac',
            time: options.track.duration,
            br: 999000,
          }
        },
      },
      builtinUnblock: {
        resolve: async () => {
          calls.push('builtin')
          return null
        },
      },
      lxMusic: {
        resolve: async () => {
          calls.push('lx')
          return null
        },
      },
      customApi: {
        resolve: async () => {
          calls.push('custom')
          return null
        },
      },
    },
  })

  const result = await resolvePlaybackSource({ track })

  assert.deepEqual(result, {
    id: track.id,
    url: 'https://cdn.example.com/official.flac',
    time: track.duration,
    br: 999000,
  })
  assert.deepEqual(calls, ['official:true'])
})

test('unauthenticated playback falls through when builtin platforms normalize to empty', async () => {
  const calls: string[] = []
  const track = createTrack()

  const resolvePlaybackSource = createPlaybackSourceResolver({
    getAuthState: () => ({
      user: null,
      session: null,
      loginStatus: 'anonymous',
    }),
    getConfig: () => ({
      quality: 'higher',
      musicSourceEnabled: true,
      musicSourceProviders: ['lxMusic'],
      luoxueSourceEnabled: false,
      customMusicApiEnabled: false,
      customMusicApiUrl: '',
    }),
    providers: {
      builtinUnblock: {
        resolve: async options => {
          calls.push(`builtin:${options.policy.builtinPlatforms.length}`)
          return null
        },
      },
      official: {
        resolve: async options => {
          calls.push(`official:${options.context.isAuthenticated}`)
          return {
            id: options.track.id,
            url: 'https://cdn.example.com/fallback-official.mp3',
            time: options.track.duration,
            br: 320000,
          }
        },
      },
      lxMusic: {
        resolve: async () => {
          calls.push('lx')
          return null
        },
      },
      customApi: {
        resolve: async () => {
          calls.push('custom')
          return null
        },
      },
    },
  })

  const result = await resolvePlaybackSource({ track })

  assert.deepEqual(result, {
    id: track.id,
    url: 'https://cdn.example.com/fallback-official.mp3',
    time: track.duration,
    br: 320000,
  })
  assert.deepEqual(calls, ['builtin:0', 'official:false'])
})

test('musicSourceEnabled false tries official directly', async () => {
  const calls: string[] = []
  const track = createTrack()

  const resolvePlaybackSource = createPlaybackSourceResolver({
    getAuthState: () => ({
      user: null,
      session: null,
      loginStatus: 'anonymous',
    }),
    getConfig: () => ({
      quality: 'higher',
      musicSourceEnabled: false,
      musicSourceProviders: ['migu', 'lxMusic'],
      luoxueSourceEnabled: true,
      customMusicApiEnabled: true,
      customMusicApiUrl: 'https://api.example.com',
    }),
    providers: {
      official: {
        resolve: async () => {
          calls.push('official')
          return {
            id: track.id,
            url: 'https://cdn.example.com/official-only.mp3',
            time: track.duration,
            br: 128000,
          }
        },
      },
      builtinUnblock: {
        resolve: async () => {
          calls.push('builtin')
          return null
        },
      },
      lxMusic: {
        resolve: async () => {
          calls.push('lx')
          return null
        },
      },
      customApi: {
        resolve: async () => {
          calls.push('custom')
          return null
        },
      },
    },
  })

  const result = await resolvePlaybackSource({ track })

  assert.deepEqual(result, {
    id: track.id,
    url: 'https://cdn.example.com/official-only.mp3',
    time: track.duration,
    br: 128000,
  })
  assert.deepEqual(calls, ['official'])
})

test('playback resolver traces resolver order and hit result', async () => {
  const traceEvents: Array<Record<string, unknown>> = []
  const track = createTrack()

  const resolvePlaybackSource = createPlaybackSourceResolver({
    getAuthState: () => ({
      user: null,
      session: null,
      loginStatus: 'anonymous',
    }),
    getConfig: () => ({
      quality: 'higher',
      musicSourceEnabled: true,
      musicSourceProviders: ['migu', 'lxMusic'],
      luoxueSourceEnabled: true,
      customMusicApiEnabled: false,
      customMusicApiUrl: '',
    }),
    trace: {
      log: event => {
        traceEvents.push(event as Record<string, unknown>)
      },
    },
    providers: {
      builtinUnblock: {
        resolve: async () => null,
      },
      lxMusic: {
        resolve: async options => ({
          id: options.track.id,
          url: 'https://cdn.example.com/traced-from-lx.flac',
          time: options.track.duration,
          br: 0,
        }),
      },
      official: {
        resolve: async () => {
          throw new Error('official should not run after LX hit')
        },
      },
      customApi: {
        resolve: async () => null,
      },
    },
  })

  const result = await resolvePlaybackSource({ track })

  assert.deepEqual(result, {
    id: track.id,
    url: 'https://cdn.example.com/traced-from-lx.flac',
    time: track.duration,
    br: 0,
  })
  assert.deepEqual(traceEvents, [
    {
      type: 'start',
      trackId: track.id,
      isAuthenticated: false,
      resolverOrder: ['builtinUnblock', 'lxMusic', 'official'],
      builtinPlatforms: ['migu'],
    },
    {
      type: 'try',
      trackId: track.id,
      resolverId: 'builtinUnblock',
    },
    {
      type: 'miss',
      trackId: track.id,
      resolverId: 'builtinUnblock',
    },
    {
      type: 'try',
      trackId: track.id,
      resolverId: 'lxMusic',
    },
    {
      type: 'hit',
      trackId: track.id,
      resolverId: 'lxMusic',
    },
  ])
})

test('lx playback provider returns null instead of crashing on partial config', async () => {
  const provider = createLxPlaybackProvider()

  const result = await provider.resolve({
    track: createTrack(),
    context: {
      scene: 'playback',
      isAuthenticated: false,
      config: {
        musicSourceEnabled: true,
        musicSourceProviders: ['lxMusic'],
        luoxueSourceEnabled: true,
        customMusicApiEnabled: false,
        customMusicApiUrl: '',
        quality: 'higher',
      },
    },
    policy: {
      resolverOrder: ['lxMusic'],
      builtinPlatforms: [],
    },
    config: {
      musicSourceEnabled: true,
      musicSourceProviders: ['lxMusic'],
      luoxueSourceEnabled: true,
      customMusicApiEnabled: false,
      customMusicApiUrl: '',
      quality: 'higher',
    },
  })

  assert.equal(result, null)
})
