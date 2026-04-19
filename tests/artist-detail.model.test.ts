import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeSimilarArtists } from '../src/renderer/pages/Artists/artist-detail.model.ts'
import { createArtistTopSongPlaybackQueue } from '../src/renderer/pages/Artists/Detail/model/artist-detail-page.model.ts'

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

test('createArtistTopSongPlaybackQueue maps artist songs into playback tracks', () => {
  const playbackQueue = createArtistTopSongPlaybackQueue([
    {
      id: 1001,
      name: 'Song A',
      subtitle: '',
      duration: 213000,
      albumName: 'Album A',
      coverUrl: 'https://img.example.com/a.jpg',
      artists: [
        { id: 1, name: 'Artist A' },
        { id: 2, name: 'Artist B' },
      ],
    },
  ])

  assert.deepEqual(playbackQueue, [
    {
      id: 1001,
      name: 'Song A',
      artistNames: 'Artist A / Artist B',
      albumName: 'Album A',
      coverUrl: 'https://img.example.com/a.jpg',
      duration: 213000,
    },
  ])
})
