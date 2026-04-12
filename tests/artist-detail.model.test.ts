import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeSimilarArtists } from '../src/renderer/pages/Artists/artist-detail.model.ts'

test('normalizeSimilarArtists maps similar artist payload into cover items', () => {
  const artists = normalizeSimilarArtists({
    artists: [
      {
        id: 101,
        name: 'Artist A',
        picUrl: 'https://img.example.com/a.jpg',
      },
      {
        id: 102,
        name: 'Artist B',
        img1v1Url: 'https://img.example.com/b.jpg',
      },
    ],
  })

  assert.deepEqual(artists, [
    {
      id: 101,
      name: 'Artist A',
      picUrl: 'https://img.example.com/a.jpg',
    },
    {
      id: 102,
      name: 'Artist B',
      picUrl: 'https://img.example.com/b.jpg',
    },
  ])
})
