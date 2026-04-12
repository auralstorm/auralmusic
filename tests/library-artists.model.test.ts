import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeLibraryArtistPage,
  normalizeSubscribedArtistList,
} from '../src/renderer/pages/Library/library-artists.model.ts'

test('normalizeSubscribedArtistList maps nested subscribed artist payload', () => {
  const artists = normalizeSubscribedArtistList({
    data: {
      artists: [
        {
          id: 11,
          name: 'Artist A',
          picUrl: 'https://img.example.com/a.jpg',
        },
        {
          id: 12,
          name: 'Artist B',
          img1v1Url: 'https://img.example.com/b.jpg',
          albumSize: 8,
        },
      ],
    },
  })

  assert.deepEqual(artists, [
    {
      id: 11,
      name: 'Artist A',
      picUrl: 'https://img.example.com/a.jpg',
      alias: undefined,
      albumSize: undefined,
      musicSize: undefined,
    },
    {
      id: 12,
      name: 'Artist B',
      picUrl: 'https://img.example.com/b.jpg',
      alias: undefined,
      albumSize: 8,
      musicSize: undefined,
    },
  ])
})

test('normalizeSubscribedArtistList maps direct data array payload from artist sublist', () => {
  const artists = normalizeSubscribedArtistList({
    data: [
      {
        id: 31,
        name: 'Artist D',
        picUrl: 'https://img.example.com/d.jpg',
      },
      {
        id: 32,
        name: 'Artist E',
        img1v1Url: 'https://img.example.com/e.jpg',
        musicSize: 66,
      },
    ],
  })

  assert.deepEqual(artists, [
    {
      id: 31,
      name: 'Artist D',
      picUrl: 'https://img.example.com/d.jpg',
      alias: undefined,
      albumSize: undefined,
      musicSize: undefined,
    },
    {
      id: 32,
      name: 'Artist E',
      picUrl: 'https://img.example.com/e.jpg',
      alias: undefined,
      albumSize: undefined,
      musicSize: 66,
    },
  ])
})

test('normalizeLibraryArtistPage keeps hasMore from payload metadata', () => {
  const page = normalizeLibraryArtistPage(
    {
      data: {
        artists: [
          {
            id: 21,
            name: 'Artist C',
            picUrl: 'https://img.example.com/c.jpg',
          },
        ],
      },
      hasMore: true,
    },
    {
      limit: 25,
      offset: 0,
    }
  )

  assert.equal(page.hasMore, true)
  assert.equal(page.list.length, 1)
  assert.equal(page.list[0]?.id, 21)
})
