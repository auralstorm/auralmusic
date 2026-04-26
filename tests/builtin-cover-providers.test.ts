import assert from 'node:assert/strict'
import test from 'node:test'

import {
  builtinCoverProviders,
  createBuiltinCoverProviders,
  readBuiltinCoverProvider,
} from '../src/renderer/services/music-metadata/providers/cover/index.ts'
import { createKgBuiltinCoverProvider } from '../src/renderer/services/music-metadata/providers/cover/kg-builtin-cover-provider.ts'
import { createKwBuiltinCoverProvider } from '../src/renderer/services/music-metadata/providers/cover/kw-builtin-cover-provider.ts'
import { createMgBuiltinCoverProvider } from '../src/renderer/services/music-metadata/providers/cover/mg-builtin-cover-provider.ts'
import { txBuiltinCoverProvider } from '../src/renderer/services/music-metadata/providers/cover/tx-builtin-cover-provider.ts'
import { wyBuiltinCoverProvider } from '../src/renderer/services/music-metadata/providers/cover/wy-builtin-cover-provider.ts'

function createTrack(overrides: Record<string, unknown> = {}) {
  return {
    id: 102065756,
    name: '七里香',
    artistNames: '周杰伦',
    albumName: '七里香',
    duration: 299000,
    coverUrl: '',
    lockedPlatform: 'wy',
    lxInfo: {
      songmid: '004Z8Ihr0JIu5s',
      hash: '2C7CEB6CC2340ECC8948E0ACE62F0CF8',
      albumId: '004Z8Ihr0JIu5s',
      copyrightId: '60054701934',
      source: 'wy',
    },
    ...overrides,
  }
}

test('builtin cover registry exposes all five platform providers', () => {
  assert.deepEqual(Object.keys(builtinCoverProviders).sort(), [
    'kg',
    'kw',
    'mg',
    'tx',
    'wy',
  ])
})

test('createBuiltinCoverProviders returns planned registry shape', () => {
  const providers = createBuiltinCoverProviders()
  assert.deepEqual(Object.keys(providers).sort(), [
    'kg',
    'kw',
    'mg',
    'tx',
    'wy',
  ])
  assert.equal(readBuiltinCoverProvider(providers, 'kw'), providers.kw)
})

test('readBuiltinCoverProvider returns null for null registries and unknown sources', () => {
  assert.equal(readBuiltinCoverProvider(null, 'wy'), null)
  assert.equal(
    readBuiltinCoverProvider(createBuiltinCoverProviders(), 'qq'),
    null
  )
})

test('wy builtin cover provider prefers existing track cover', async () => {
  const result = await wyBuiltinCoverProvider.getCover(
    createTrack({
      coverUrl: 'https://example.com/wy-cover.jpg',
    }) as never
  )

  assert.deepEqual(result, {
    coverUrl: 'https://example.com/wy-cover.jpg',
  })
})

test('tx builtin cover provider builds qq album cover url from album id', async () => {
  const result = await txBuiltinCoverProvider.getCover(
    createTrack({
      lockedPlatform: 'tx',
      lxInfo: {
        albumId: '004Z8Ihr0JIu5s',
        source: 'tx',
      },
    }) as never
  )

  assert.deepEqual(result, {
    coverUrl:
      'https://y.gtimg.cn/music/photo_new/T002R500x500M000004Z8Ihr0JIu5s.jpg',
  })
})

test('kw builtin cover provider resolves cover url from artist pic server text response', async () => {
  const provider = createKwBuiltinCoverProvider({
    requestText: async url => {
      assert.match(url, /artistpicserver\.kuwo\.cn/)
      return 'http://img4.kuwo.cn/star/albumcover/500/42/42.jpg'
    },
  })

  const result = await provider.getCover(
    createTrack({
      lockedPlatform: 'kw',
      lxInfo: {
        songmid: '156483846',
        source: 'kw',
      },
    }) as never
  )

  assert.deepEqual(result, {
    coverUrl: 'http://img4.kuwo.cn/star/albumcover/500/42/42.jpg',
  })
})

test('kg builtin cover provider resolves cover url from kugou privilege payload', async () => {
  const provider = createKgBuiltinCoverProvider({
    requestJson: async (_url, options) => {
      assert.equal(options?.method, 'POST')
      return {
        data: [
          {
            info: {
              image:
                'https://imgessl.kugou.com/stdmusic/{size}/20240101/202401011234.jpg',
              imgsize: ['480'],
            },
          },
        ],
      }
    },
  })

  const result = await provider.getCover(
    createTrack({
      lockedPlatform: 'kg',
      lxInfo: {
        songmid: '1139129604',
        hash: '2C7CEB6CC2340ECC8948E0ACE62F0CF8',
        albumId: '69080900009',
        source: 'kg',
      },
    }) as never
  )

  assert.deepEqual(result, {
    coverUrl:
      'https://imgessl.kugou.com/stdmusic/480/20240101/202401011234.jpg',
  })
})

test('mg builtin cover provider falls back to song pic endpoint when search result cover is missing', async () => {
  const provider = createMgBuiltinCoverProvider({
    requestJson: async url => {
      assert.match(url, /getSongPic/)
      return {
        largePic: '//cdn.music.migu.cn/cover/large.jpg',
      }
    },
  })

  const result = await provider.getCover(
    createTrack({
      lockedPlatform: 'mg',
      lxInfo: {
        songmid: '60054701934',
        source: 'mg',
      },
    }) as never
  )

  assert.deepEqual(result, {
    coverUrl: 'http://cdn.music.migu.cn/cover/large.jpg',
  })
})
