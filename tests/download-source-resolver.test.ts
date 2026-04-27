import assert from 'node:assert/strict'
import test from 'node:test'

import { createDownloadSourceResolver } from '../src/renderer/services/download/model/download-source-resolver.model.ts'
import type { DownloadSourceResolverDeps } from '../src/renderer/types/core/download-source.types.ts'

function createConfig(overrides: Record<string, unknown> = {}) {
  return {
    musicSourceEnabled: true,
    musicSourceProviders: ['lxMusic'],
    luoxueSourceEnabled: true,
    customMusicApiEnabled: false,
    customMusicApiUrl: '',
    activeLuoxueMusicSourceScriptId: 'script-1',
    luoxueMusicSourceScripts: [{ id: 'script-1' }] as never,
    ...overrides,
  }
}

function createTrack() {
  return {
    id: 1,
    name: 'Test Song',
    artistNames: 'Artist',
    albumName: 'Album',
    coverUrl: '',
    duration: 200000,
    fee: 0,
  }
}

test('createDownloadSourceResolver falls back from official family to LX and returns effective quality', async () => {
  const calls: string[] = []

  const deps: DownloadSourceResolverDeps = {
    getAuthState: () => ({ isAuthenticated: true, isVip: true }),
    getSongUrlV1: async params => {
      calls.push(`song-url:${params.level}:${params.unblock}`)
      throw new Error('playback unavailable')
    },
    getSongDownloadUrlV1: async params => {
      calls.push(`song-download:${params.level}`)
      throw new Error('download unavailable')
    },
    resolveTrackWithLxMusicSource: async params => {
      calls.push(`lx:${params.quality}`)
      return {
        id: 1,
        url: 'https://cdn.example.com/full.flac',
        time: 200000,
        br: 0,
      }
    },
    getConfig: () => createConfig(),
  }

  const resolveDownloadSource = createDownloadSourceResolver(deps)
  const result = await resolveDownloadSource({
    track: createTrack(),
    requestedQuality: 'lossless',
    policy: 'fallback',
  })

  assert.deepEqual(result, {
    url: 'https://cdn.example.com/full.flac',
    quality: 'lossless',
    provider: 'lxMusic',
    fileExtension: '.flac',
  })
  assert.deepEqual(calls, [
    'song-url:lossless:false',
    'song-download:lossless',
    'lx:lossless',
  ])
})

test('createDownloadSourceResolver returns official playback when official download is empty', async () => {
  const calls: string[] = []

  const deps: DownloadSourceResolverDeps = {
    getAuthState: () => ({ isAuthenticated: true, isVip: true }),
    getSongDownloadUrlV1: async params => {
      calls.push(`song-download:${params.level}`)
      return { data: { data: { url: '' } } }
    },
    getSongUrlV1: async params => {
      calls.push(`song-url:${params.level}:${params.unblock}`)
      return {
        data: { data: [{ id: 2, url: 'https://cdn.example.com/track.mp3' }] },
      }
    },
    resolveTrackWithLxMusicSource: async () => {
      calls.push('lx')
      return null
    },
    getConfig: () => createConfig(),
  }

  const resolveDownloadSource = createDownloadSourceResolver(deps)
  const result = await resolveDownloadSource({
    track: {
      ...createTrack(),
      id: 3,
      name: 'Playback Song',
      duration: 180000,
    },
    requestedQuality: 'higher',
    policy: 'fallback',
  })

  assert.deepEqual(result, {
    url: 'https://cdn.example.com/track.mp3',
    quality: 'higher',
    provider: 'official-playback',
    fileExtension: '.mp3',
  })
  assert.deepEqual(calls, ['song-url:higher:false'])
})

test('createDownloadSourceResolver bypasses official providers for authenticated non-vip paid tracks', async () => {
  const calls: string[] = []

  const deps: DownloadSourceResolverDeps = {
    getAuthState: () => ({ isAuthenticated: true, isVip: false }),
    getSongDownloadUrlV1: async () => {
      calls.push('song-download')
      return { data: { data: { url: 'https://cdn.example.com/official.mp3' } } }
    },
    getSongUrlV1: async () => {
      calls.push('song-url')
      return {
        data: {
          data: [{ id: 9, url: 'https://cdn.example.com/official.mp3' }],
        },
      }
    },
    resolveTrackWithLxMusicSource: async params => {
      calls.push(`lx:${params.quality}`)
      return {
        id: 9,
        url: 'https://cdn.example.com/from-lx.flac',
        time: 200000,
        br: 0,
      }
    },
    getConfig: () => createConfig(),
  }

  const resolveDownloadSource = createDownloadSourceResolver(deps)
  const result = await resolveDownloadSource({
    track: {
      ...createTrack(),
      id: 9,
      fee: 1,
    },
    requestedQuality: 'higher',
    policy: 'fallback',
  })

  assert.deepEqual(result, {
    url: 'https://cdn.example.com/from-lx.flac',
    quality: 'higher',
    provider: 'lxMusic',
    fileExtension: '.flac',
  })
  assert.deepEqual(calls, ['lx:higher'])
})

test('createDownloadSourceResolver prefers official playback over official download when both are available', async () => {
  const calls: string[] = []

  const deps: DownloadSourceResolverDeps = {
    getAuthState: () => ({ isAuthenticated: true, isVip: true }),
    getSongDownloadUrlV1: async params => {
      calls.push(`song-download:${params.level}`)
      return {
        data: {
          data: {
            url: 'https://cdn.example.com/download-preview.mp3',
            encodeType: 'mp3',
          },
        },
      }
    },
    getSongUrlV1: async params => {
      calls.push(`song-url:${params.level}:${params.unblock}`)
      return {
        data: {
          data: [{ id: 5, url: 'https://cdn.example.com/playback-full.flac' }],
        },
      }
    },
    resolveTrackWithLxMusicSource: async () => {
      calls.push('lx')
      return null
    },
    getConfig: () => createConfig(),
  }

  const resolveDownloadSource = createDownloadSourceResolver(deps)
  const result = await resolveDownloadSource({
    track: {
      ...createTrack(),
      id: 5,
      name: 'Prefer Playback Song',
      duration: 180000,
    },
    requestedQuality: 'higher',
    policy: 'fallback',
  })

  assert.deepEqual(result, {
    url: 'https://cdn.example.com/playback-full.flac',
    quality: 'higher',
    provider: 'official-playback',
    fileExtension: '.flac',
  })
  assert.deepEqual(calls, ['song-url:higher:false'])
})

test('createDownloadSourceResolver uses the default API loader for official download', async () => {
  const calls: string[] = []

  const deps: DownloadSourceResolverDeps = {
    getAuthState: () => ({ isAuthenticated: true, isVip: true }),
    loadSongApiListModule: async () => {
      calls.push('load-api')
      return {
        getSongDownloadUrlV1: async params => {
          calls.push(`song-download:${params.level}`)
          return {
            data: {
              data: {
                url: 'https://cdn.example.com/default-official.flac',
              },
            },
          }
        },
        getSongUrlV1: async () => {
          throw new Error('playback fallback should not run')
        },
        getSongUrlMatch: async () => {
          throw new Error('match fallback should not run')
        },
      }
    },
    resolveTrackWithLxMusicSource: async () => {
      throw new Error('lx fallback should not run')
    },
    getConfig: () => createConfig(),
  }

  const resolveDownloadSource = createDownloadSourceResolver(deps)
  const result = await resolveDownloadSource({
    track: {
      ...createTrack(),
      id: 4,
      name: 'Default Official Song',
      duration: 180000,
    },
    requestedQuality: 'lossless',
    policy: 'fallback',
  })

  assert.deepEqual(result, {
    url: 'https://cdn.example.com/default-official.flac',
    quality: 'lossless',
    provider: 'official-download',
    fileExtension: '.flac',
  })
  assert.deepEqual(calls, ['load-api', 'load-api', 'song-download:lossless'])
})

test('createDownloadSourceResolver derives extension from official download payload', async () => {
  const deps: DownloadSourceResolverDeps = {
    getAuthState: () => ({ isAuthenticated: true, isVip: true }),
    getSongDownloadUrlV1: async params => {
      assert.equal(params.level, 'higher')
      assert.equal(params.id, 2)

      return {
        data: {
          data: {
            url: 'https://cdn.example.com/official-track',
            encodeType: 'aac',
          },
        },
      }
    },
    getSongUrlV1: async () => {
      throw new Error('playback fallback should not run')
    },
    resolveTrackWithLxMusicSource: async () => {
      throw new Error('lx fallback should not run')
    },
    getConfig: () => createConfig(),
  }

  const resolveDownloadSource = createDownloadSourceResolver(deps)
  const result = await resolveDownloadSource({
    track: {
      ...createTrack(),
      id: 2,
      name: 'Official Song',
      duration: 180000,
    },
    requestedQuality: 'higher',
    policy: 'fallback',
  })

  assert.deepEqual(result, {
    url: 'https://cdn.example.com/official-track',
    quality: 'higher',
    provider: 'official-download',
    fileExtension: '.aac',
  })
})

test('createDownloadSourceResolver stops after the requested quality when policy is strict', async () => {
  const calls: string[] = []

  const resolveDownloadSource = createDownloadSourceResolver({
    getAuthState: () => ({ isAuthenticated: true, isVip: true }),
    getSongDownloadUrlV1: async params => {
      calls.push(`song-download:${params.level}`)
      return { data: { data: { url: '' } } }
    },
    getSongUrlV1: async params => {
      calls.push(`song-url:${params.level}:${params.unblock}`)
      return {
        data: { data: [{ id: 1, url: '' }] },
      }
    },
    resolveTrackWithLxMusicSource: async params => {
      calls.push(`lx:${params.quality}`)
      return null
    },
    getConfig: () => createConfig(),
  })

  const result = await resolveDownloadSource({
    track: {
      ...createTrack(),
      name: 'Strict Song',
      duration: 1_000,
    },
    requestedQuality: 'lossless',
    policy: 'strict',
  })

  assert.equal(result, null)
  assert.deepEqual(calls, [
    'song-url:lossless:false',
    'song-download:lossless',
    'lx:lossless',
  ])
})

test('createDownloadSourceResolver falls through lower qualities when policy is fallback', async () => {
  const calls: string[] = []

  const resolveDownloadSource = createDownloadSourceResolver({
    getAuthState: () => ({ isAuthenticated: true, isVip: true }),
    getSongDownloadUrlV1: async params => {
      calls.push(`song-download:${params.level}`)
      return {
        data: {
          data: {
            url:
              params.level === 'higher'
                ? 'https://cdn.example.com/fallback.mp3'
                : '',
          },
        },
      }
    },
    getSongUrlV1: async params => {
      calls.push(`song-url:${params.level}:${params.unblock}`)
      return {
        data: { data: [{ id: 1, url: '' }] },
      }
    },
    resolveTrackWithLxMusicSource: async params => {
      calls.push(`lx:${params.quality}`)
      return null
    },
    getConfig: () => createConfig(),
  })

  const result = await resolveDownloadSource({
    track: {
      ...createTrack(),
      name: 'Fallback Song',
      duration: 1_000,
    },
    requestedQuality: 'lossless',
    policy: 'fallback',
  })

  assert.deepEqual(result, {
    url: 'https://cdn.example.com/fallback.mp3',
    quality: 'higher',
    provider: 'official-download',
    fileExtension: '.mp3',
  })
  assert.deepEqual(calls, [
    'song-url:lossless:false',
    'song-download:lossless',
    'lx:lossless',
    'song-url:exhigh:false',
    'song-download:exhigh',
    'lx:exhigh',
    'song-url:higher:false',
    'song-download:higher',
  ])
})

test('createDownloadSourceResolver prefers builtin unblock before official when unauthenticated', async () => {
  const calls: string[] = []

  const resolveDownloadSource = createDownloadSourceResolver({
    getConfig: () =>
      createConfig({
        musicSourceProviders: ['migu'],
        luoxueSourceEnabled: false,
      }),
    getAuthState: () => ({ isAuthenticated: false, isVip: false }),
    getSongDownloadUrlV1: async () => {
      calls.push('official-download')
      return {
        data: { data: { url: 'https://cdn.example.com/official.flac' } },
      }
    },
    getSongUrlMatch: async params => {
      calls.push(`song-match:${params.source}`)
      return {
        data: { data: 'https://cdn.example.com/unblock.mp3' },
      }
    },
    resolveTrackWithLxMusicSource: async () => {
      calls.push('lx')
      return null
    },
  })

  const result = await resolveDownloadSource({
    track: createTrack(),
    requestedQuality: 'higher',
    policy: 'strict',
  })

  assert.equal(result?.provider, 'builtin-unblock')
  assert.deepEqual(calls, ['song-match:unm'])
})

test('createDownloadSourceResolver still tries builtin unblock when legacy builtin providers are empty', async () => {
  const calls: string[] = []

  const resolveDownloadSource = createDownloadSourceResolver({
    getConfig: () =>
      createConfig({
        musicSourceProviders: ['lxMusic'],
        luoxueSourceEnabled: false,
      }),
    getAuthState: () => ({ isAuthenticated: false, isVip: false }),
    getSongDownloadUrlV1: async () => {
      calls.push('official-download')
      return {
        data: { data: { url: 'https://cdn.example.com/official.flac' } },
      }
    },
    getSongUrlMatch: async params => {
      calls.push(`song-match:${params.source}`)
      return {
        data: { data: 'https://cdn.example.com/unblock.mp3' },
      }
    },
    resolveTrackWithLxMusicSource: async () => {
      calls.push('lx')
      return null
    },
  })

  const result = await resolveDownloadSource({
    track: createTrack(),
    requestedQuality: 'higher',
    policy: 'strict',
  })

  assert.equal(result?.provider, 'builtin-unblock')
  assert.deepEqual(calls, ['song-match:unm'])
})

test('createDownloadSourceResolver does not fall through to official when music source remains enabled for unauthenticated users', async () => {
  const calls: string[] = []

  const resolveDownloadSource = createDownloadSourceResolver({
    getConfig: () =>
      createConfig({
        musicSourceProviders: ['migu'],
      }),
    getAuthState: () => ({ isAuthenticated: false, isVip: false }),
    getSongDownloadUrlV1: async () => {
      calls.push('official-download')
      return {
        data: { data: { url: 'https://cdn.example.com/official.flac' } },
      }
    },
    getSongUrlMatch: async params => {
      calls.push(`song-match:${params.source}`)
      return { data: { data: '' } }
    },
    resolveTrackWithLxMusicSource: async () => {
      calls.push('lx')
      return null
    },
  })

  const result = await resolveDownloadSource({
    track: createTrack(),
    requestedQuality: 'higher',
    policy: 'strict',
  })

  assert.equal(result, null)
  assert.deepEqual(calls, [
    'song-match:unm',
    'song-match:bikonoo',
    'song-match:gdmusic',
    'song-match:msls',
    'song-match:qijieya',
    'lx',
  ])
})

test('createDownloadSourceResolver sends non-wy locked tracks directly to lx source', async () => {
  const calls: string[] = []

  const resolveDownloadSource = createDownloadSourceResolver({
    getConfig: () => createConfig(),
    getAuthState: () => ({ isAuthenticated: true, isVip: true }),
    getSongUrlV1: async () => {
      calls.push('official-playback')
      return {
        data: {
          data: [{ id: 77, url: 'https://cdn.example.com/official.mp3' }],
        },
      }
    },
    getSongDownloadUrlV1: async () => {
      calls.push('official-download')
      return {
        data: { data: { url: 'https://cdn.example.com/official.flac' } },
      }
    },
    getSongUrlMatch: async () => {
      calls.push('builtin-unblock')
      return { data: { data: 'https://cdn.example.com/unblock.mp3' } }
    },
    resolveTrackWithLxMusicSource: async params => {
      calls.push(`lx:${params.track.lockedPlatform}:${params.quality}`)
      return {
        id: 77,
        url: 'https://cdn.example.com/tencent.flac',
        time: 200000,
        br: 0,
      }
    },
  })

  const result = await resolveDownloadSource({
    track: {
      ...createTrack(),
      id: 77,
      lockedPlatform: 'tx',
      lxInfo: {
        songmid: 'tx-mid',
        source: 'tx',
      },
    },
    requestedQuality: 'lossless',
    policy: 'fallback',
  })

  assert.deepEqual(result, {
    url: 'https://cdn.example.com/tencent.flac',
    quality: 'lossless',
    provider: 'lxMusic',
    fileExtension: '.flac',
  })
  assert.deepEqual(calls, ['lx:tx:lossless'])
})
