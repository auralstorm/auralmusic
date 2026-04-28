import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeKgSearchResult } from '../src/renderer/services/music-source/builtin-search/providers/kg-builtin-search-provider.ts'
import { normalizeMgSearchResult } from '../src/renderer/services/music-source/builtin-search/providers/mg-builtin-search-provider.ts'

test('kg builtin search keeps audio id for later cover lookup', () => {
  const result = normalizeKgSearchResult(
    {
      data: {
        total: 1,
        lists: [
          {
            Audioid: 1139129604,
            FileHash: '2C7CEB6CC2340ECC8948E0ACE62F0CF8',
            SongName: 'Song',
            AlbumName: 'Album',
            AlbumID: '69080900009',
            Duration: 180,
          },
        ],
      },
    },
    1,
    20
  )

  assert.equal(result.list[0]?.lxInfo?.audioId, '1139129604')
})

test('mg builtin search stores explicit song id for later cover lookup', () => {
  const result = normalizeMgSearchResult(
    {
      songResultData: {
        resultList: [
          [
            {
              songId: '807791',
              copyrightId: '63480214121',
              name: 'Song',
              album: 'Album',
            },
          ],
        ],
      },
    },
    1,
    20
  )

  assert.equal(result.list[0]?.lxInfo?.songId, '807791')
  assert.equal(result.list[0]?.lxInfo?.songmid, 807791)
})

test('mg builtin search expands relative oss cover paths to migu image host', () => {
  const result = normalizeMgSearchResult(
    {
      songResultData: {
        resultList: [
          [
            {
              songId: '1002223676',
              copyrightId: '69910790266',
              name: '绅士',
              album: 'Album',
              img1: '/data/oss/resource/00/2v/jf/9b54a1a3317e47b58fc09fd628e166f4.webp',
            },
          ],
        ],
      },
    },
    1,
    20
  )

  const coverUrl =
    'https://d.musicapp.migu.cn/data/oss/resource/00/2v/jf/9b54a1a3317e47b58fc09fd628e166f4.webp'

  assert.equal(result.list[0]?.coverUrl, coverUrl)
  assert.equal(result.list[0]?.lxInfo?.img, coverUrl)
})
