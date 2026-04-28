import assert from 'node:assert/strict'
import test from 'node:test'

import {
  builtinLyricProviders,
  createBuiltinLyricProviders,
  readBuiltinLyricProvider,
} from '../src/renderer/services/music-metadata/providers/lyric/index.ts'
import { createKgBuiltinLyricProvider } from '../src/renderer/services/music-metadata/providers/lyric/kg-builtin-lyric-provider.ts'
import { createKwBuiltinLyricProvider } from '../src/renderer/services/music-metadata/providers/lyric/kw-builtin-lyric-provider.ts'
import { createMgBuiltinLyricProvider } from '../src/renderer/services/music-metadata/providers/lyric/mg-builtin-lyric-provider.ts'
import { createTxBuiltinLyricProvider } from '../src/renderer/services/music-metadata/providers/lyric/tx-builtin-lyric-provider.ts'
import { createWyBuiltinLyricProvider } from '../src/renderer/services/music-metadata/providers/lyric/wy-builtin-lyric-provider.ts'

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
      copyrightId: '60054701934',
      source: 'wy',
    },
    ...overrides,
  }
}

test('builtin lyric registry exposes all five platform providers', () => {
  assert.deepEqual(Object.keys(builtinLyricProviders).sort(), [
    'kg',
    'kw',
    'mg',
    'tx',
    'wy',
  ])
})

test('createBuiltinLyricProviders returns the planned builtin lyric registry shape', () => {
  const providers = createBuiltinLyricProviders()

  assert.deepEqual(Object.keys(providers).sort(), [
    'kg',
    'kw',
    'mg',
    'tx',
    'wy',
  ])
  assert.equal(readBuiltinLyricProvider(providers, 'mg'), providers.mg)
})

test('readBuiltinLyricProvider returns null for null registries and unknown sources', () => {
  assert.equal(readBuiltinLyricProvider(null, 'wy'), null)
  assert.equal(
    readBuiltinLyricProvider(createBuiltinLyricProviders(), 'qq'),
    null
  )
})

test('wy builtin lyric provider normalizes lyric, translation and yrc payloads', async () => {
  const provider = createWyBuiltinLyricProvider({
    getLyricNew: async () => ({
      data: {
        lrc: { lyric: '[00:01.00]原文' },
        tlyric: { lyric: '[00:01.00]译文' },
        yrc: { lyric: '[0,1000](0,1000,0)原文' },
      },
    }),
  })

  const result = await provider.getLyric(createTrack())

  assert.deepEqual(result, {
    lyric: '[00:01.00]原文',
    translatedLyric: '[00:01.00]译文',
    yrc: '[0,1000](0,1000,0)原文',
  })
})

test('tx builtin lyric provider reads plain lyric payloads from qq lyric endpoint', async () => {
  const provider = createTxBuiltinLyricProvider({
    requestJson: async () => ({
      lyric: '[00:00.00]七里香',
      trans: '[00:00.00]Common Jasmin Orange',
    }),
  })

  const result = await provider.getLyric(
    createTrack({
      lockedPlatform: 'tx',
      lxInfo: {
        songmid: '004Z8Ihr0JIu5s',
        source: 'tx',
      },
    })
  )

  assert.deepEqual(result, {
    lyric: '[00:00.00]七里香',
    translatedLyric: '[00:00.00]Common Jasmin Orange',
  })
})

test('kw builtin lyric provider requests openapi lyric with a fresh reqId and converts lrclist entries', async () => {
  const requestedUrls: string[] = []
  const provider = createKwBuiltinLyricProvider({
    createReqId: () => `req-${requestedUrls.length + 1}`,
    requestJson: async url => {
      requestedUrls.push(url)
      return {
        data: {
          lrclist: [
            { time: '0.12', lineLyric: '第一句' },
            { time: '12.34', lineLyric: '第二句' },
          ],
        },
      }
    },
  })

  const track = createTrack({
    lockedPlatform: 'kw',
    lxInfo: {
      songmid: '389528329',
      source: 'kw',
    },
  })
  const result = await provider.getLyric(track)
  await provider.getLyric(track)

  assert.equal(requestedUrls.length, 2)
  assert.equal(
    requestedUrls[0],
    'https://kuwo.cn/openapi/v1/www/lyric/getlyric?musicId=389528329&httpsStatus=1&reqId=req-1&plat=web_www&from='
  )
  assert.equal(
    requestedUrls[1],
    'https://kuwo.cn/openapi/v1/www/lyric/getlyric?musicId=389528329&httpsStatus=1&reqId=req-2&plat=web_www&from='
  )

  assert.deepEqual(result, {
    lyric: '[00:00.12]第一句\n[00:12.34]第二句',
  })
})

test('kg builtin lyric provider downloads and decodes base64 lyric content', async () => {
  const provider = createKgBuiltinLyricProvider({
    requestJson: async url => {
      if (url.includes('/search?')) {
        return {
          candidates: [
            {
              id: '139713786',
              accesskey: '0BB14D18ACC852786A662DF4C5636E18',
            },
          ],
        }
      }

      return {
        content: Buffer.from('[00:00.00]七里香', 'utf8').toString('base64'),
      }
    },
  })

  const result = await provider.getLyric(
    createTrack({
      lockedPlatform: 'kg',
      lxInfo: {
        hash: '2C7CEB6CC2340ECC8948E0ACE62F0CF8',
        source: 'kg',
      },
    })
  )

  assert.deepEqual(result, {
    lyric: '[00:00.00]七里香',
  })
})

test('mg builtin lyric provider returns null when search results only contain unrelated lyric urls', async () => {
  let requestedLyricText = false
  const provider = createMgBuiltinLyricProvider({
    now: () => 1714060800000,
    requestJson: async url => {
      if (url.includes('/search/searchAll?')) {
        return {
          songResultData: {
            resultList: [
              [
                {
                  songId: '9999',
                  copyrightId: '9999',
                  name: '七里香 Live',
                  singerList: [{ name: '周杰伦' }],
                  lrcUrl: 'https://lyrics.example.com/live.lrc',
                },
                {
                  songId: '8888',
                  copyrightId: '8888',
                  name: '七里香',
                  singerList: [{ name: '别人' }],
                  lrcUrl: 'https://lyrics.example.com/other-artist.lrc',
                },
              ],
            ],
          },
        }
      }

      return null
    },
    requestText: async () => {
      requestedLyricText = true
      return '[00:00.00]不应该被请求'
    },
  })

  const result = await provider.getLyric(
    createTrack({
      lockedPlatform: 'mg',
      lxInfo: {
        copyrightId: '60054701934',
        songmid: '2768',
        source: 'mg',
      },
    })
  )

  assert.equal(result, null)
  assert.equal(requestedLyricText, false)
})

test('mg builtin lyric provider resolves lyric url from search payload and fetches lyric text', async () => {
  const provider = createMgBuiltinLyricProvider({
    now: () => 1714060800000,
    requestJson: async url => {
      if (url.includes('/search/searchAll?')) {
        return {
          songResultData: {
            resultList: [
              [
                {
                  songId: '2768',
                  copyrightId: '60054701934',
                  name: '七里香',
                  singerList: [{ name: '周杰伦' }],
                  lrcUrl: 'https://lyrics.example.com/qilixiang.lrc',
                },
              ],
            ],
          },
        }
      }

      return null
    },
    requestText: async url => {
      assert.equal(url, 'https://lyrics.example.com/qilixiang.lrc')
      return '[00:00.00]七里香'
    },
  })

  const result = await provider.getLyric(
    createTrack({
      lockedPlatform: 'mg',
      lxInfo: {
        copyrightId: '60054701934',
        source: 'mg',
      },
    })
  )

  assert.deepEqual(result, {
    lyric: '[00:00.00]七里香',
  })
})
