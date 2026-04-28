import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeKgSearchResult } from '../src/renderer/services/music-source/builtin-search/providers/kg-builtin-search-provider.ts'
import { normalizeKwSearchResult } from '../src/renderer/services/music-source/builtin-search/providers/kw-builtin-search-provider.ts'
import { normalizeMgSearchResult } from '../src/renderer/services/music-source/builtin-search/providers/mg-builtin-search-provider.ts'
import { normalizeTxSearchResult } from '../src/renderer/services/music-source/builtin-search/providers/tx-builtin-search-provider.ts'
import { normalizeWySearchResult } from '../src/renderer/services/music-source/builtin-search/providers/wy-builtin-search-provider.ts'

test('builtin search providers expose lx-style best quality labels when source payload supports it', () => {
  const tx = normalizeTxSearchResult(
    {
      req: {
        data: {
          body: {
            item_song: [
              {
                id: 1,
                mid: 'tx-mid',
                name: 'TX Song',
                interval: 180,
                singer: [{ name: 'Singer' }],
                album: { name: 'Album', mid: 'album-mid' },
                file: { media_mid: 'media-mid', size_flac: 1024 },
              },
            ],
          },
          meta: { estimate_sum: 1 },
        },
      },
    },
    1,
    20
  )
  const kw = normalizeKwSearchResult(
    {
      TOTAL: '1',
      abslist: [
        {
          MUSICRID: 'MUSIC_2',
          SONGNAME: 'KW Song',
          ARTIST: 'Singer',
          ALBUM: 'Album',
          DURATION: '180',
          N_MINFO: 'level:ff,bitrate:4000,format:flac',
        },
      ],
    },
    1,
    20
  )
  const kg = normalizeKgSearchResult(
    {
      data: {
        total: 1,
        lists: [
          {
            Audioid: 3,
            FileHash: 'hash',
            SQFileHash: 'sq-hash',
            SongName: 'KG Song',
            Duration: 180,
            Singers: [{ name: 'Singer' }],
            AlbumName: 'Album',
          },
        ],
      },
    },
    1,
    20
  )
  const wy = normalizeWySearchResult(
    {
      result: {
        songs: [
          {
            id: 4,
            name: 'WY Song',
            dt: 180000,
            hr: { br: 1900000 },
            ar: [{ name: 'Singer' }],
            al: { name: 'Album' },
          },
        ],
        songCount: 1,
      },
    },
    1,
    20
  )
  const mg = normalizeMgSearchResult(
    {
      songResultData: {
        totalCount: 1,
        resultList: [
          [
            {
              songId: 5,
              copyrightId: 'mg-copyright',
              name: 'MG Song',
              singerList: [{ name: 'Singer' }],
              album: 'Album',
              duration: 180,
              toneControl: 'HQ',
            },
          ],
        ],
      },
    },
    1,
    20
  )

  assert.equal(tx.list[0].qualityLabel, 'SQ')
  assert.equal(kw.list[0].qualityLabel, '24bit')
  assert.equal(kg.list[0].qualityLabel, 'SQ')
  assert.equal(wy.list[0].qualityLabel, '24bit')
  assert.equal(mg.list[0].qualityLabel, 'HQ')
})
