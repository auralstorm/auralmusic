import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createTxSearchBody,
  createMgSignature,
  normalizeKgSearchResult,
  normalizeKwSearchResult,
  normalizeMgSearchResult,
  normalizeWySearchResult,
} from '../src/renderer/services/music-source/builtin-search/index.ts'

test('normalizeWySearchResult maps cloudsearch payloads into builtin rows', () => {
  const result = normalizeWySearchResult(
    {
      result: {
        songCount: 1,
        songs: [
          {
            id: 123,
            name: '晴天',
            fee: 1,
            dt: 269000,
            ar: [{ name: '周杰伦' }],
            al: {
              id: 456,
              name: '叶惠美',
              picUrl: 'https://img.example.com/qt.jpg',
            },
          },
        ],
      },
    },
    1,
    20
  )

  assert.equal(result.source, 'wy')
  assert.equal(result.total, 1)
  assert.deepEqual(result.list[0], {
    id: 123,
    name: '晴天',
    artistNames: '周杰伦',
    albumName: '叶惠美',
    coverUrl: 'https://img.example.com/qt.jpg',
    duration: 269000,
    fee: 1,
    lxInfo: {
      songmid: 123,
      hash: '123',
      strMediaMid: '123',
      copyrightId: '123',
      albumId: 456,
      source: 'wy',
      img: 'https://img.example.com/qt.jpg',
    },
  })
})

test('createTxSearchBody builds QQ search payload with keyword and paging', () => {
  const body = JSON.parse(createTxSearchBody('晴天', 2, 30))
  assert.equal(body.req.param.query, '晴天')
  assert.equal(body.req.param.page_num, 2)
  assert.equal(body.req.param.num_per_page, 30)
})

test('normalizeKwSearchResult maps kuwo payloads into builtin rows', () => {
  const result = normalizeKwSearchResult(
    {
      TOTAL: '1',
      abslist: [
        {
          MUSICRID: 'MUSIC_123456',
          SONGNAME: '晴天',
          ARTIST: '周杰伦',
          ALBUM: '叶惠美',
          DURATION: '269',
          ALBUMID: '789',
        },
      ],
    },
    1,
    20
  )

  assert.equal(result.source, 'kw')
  assert.deepEqual(result.list[0], {
    id: 123456,
    name: '晴天',
    artistNames: '周杰伦',
    albumName: '叶惠美',
    coverUrl: '',
    duration: 269000,
    fee: 0,
    lxInfo: {
      songmid: '123456',
      albumId: '789',
      source: 'kw',
    },
  })
})

test('normalizeKgSearchResult flattens groups and preserves hash ids', () => {
  const result = normalizeKgSearchResult(
    {
      data: {
        total: 2,
        lists: [
          {
            Audioid: '11',
            FileHash: 'hash-11',
            SongName: '主版本',
            Singers: [{ name: '歌手 A' }],
            AlbumName: '专辑 A',
            Duration: 180,
            Grp: [
              {
                Audioid: '12',
                FileHash: 'hash-12',
                SongName: '伴奏',
                Singers: [{ name: '歌手 A' }],
                AlbumName: '专辑 A',
                Duration: 181,
              },
            ],
          },
        ],
      },
    },
    1,
    20
  )

  assert.equal(result.source, 'kg')
  assert.equal(result.list.length, 2)
  assert.equal(result.list[0]?.lxInfo?.hash, 'hash-11')
  assert.equal(result.list[1]?.lxInfo?.hash, 'hash-12')
})

test('normalizeKgSearchResult removes duplicate audio ids from grouped results', () => {
  const result = normalizeKgSearchResult(
    {
      data: {
        total: 3,
        lists: [
          {
            Audioid: '705674',
            FileHash: 'hash-main',
            SongName: '淋雨一直走',
            Singers: [{ name: '张韶涵' }],
            AlbumName: '有形的翅膀',
            Duration: 204,
            Grp: [
              {
                Audioid: '705674',
                FileHash: 'hash-live',
                SongName: '淋雨一直走',
                Singers: [{ name: '张韶涵' }],
                AlbumName: '有形的翅膀',
                Duration: 204,
              },
            ],
          },
          {
            Audioid: '705674',
            FileHash: 'hash-page-duplicate',
            SongName: '淋雨一直走',
            Singers: [{ name: '张韶涵' }],
            AlbumName: '有形的翅膀',
            Duration: 204,
          },
        ],
      },
    },
    1,
    20
  )

  assert.equal(result.list.length, 1)
  assert.equal(result.list[0]?.id, 705674)
  assert.equal(result.list[0]?.lxInfo?.hash, 'hash-main')
})

test('createMgSignature returns stable sign metadata shape', () => {
  const signature = createMgSignature('1700000000000', '晴天')
  assert.equal(typeof signature.sign, 'string')
  assert.equal(signature.sign.length > 0, true)
  assert.equal(typeof signature.deviceId, 'string')
})

test('normalizeMgSearchResult maps migu payloads into builtin rows', () => {
  const result = normalizeMgSearchResult(
    {
      songResultData: {
        totalCount: 1,
        resultList: [
          [
            {
              songId: '99',
              copyrightId: '60054701923',
              name: '晴天',
              singerList: [{ name: '周杰伦' }],
              album: '叶惠美',
              albumId: '666',
              duration: 269,
              img1: 'https://img.example.com/qt.jpg',
            },
          ],
        ],
      },
    },
    1,
    20
  )

  assert.equal(result.source, 'mg')
  assert.deepEqual(result.list[0], {
    id: 99,
    name: '晴天',
    artistNames: '周杰伦',
    albumName: '叶惠美',
    coverUrl: 'https://img.example.com/qt.jpg',
    duration: 269000,
    fee: 0,
    lxInfo: {
      songmid: 99,
      copyrightId: '60054701923',
      albumId: '666',
      source: 'mg',
      img: 'https://img.example.com/qt.jpg',
    },
  })
})
