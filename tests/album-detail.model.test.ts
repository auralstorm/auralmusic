import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeAlbumTracks,
  toAlbumListItem,
  type AlbumDetailHeroData,
} from '../src/renderer/pages/Albums/Detail/album-detail.model.ts'

test('toAlbumListItem maps album detail hero into album list item', () => {
  const hero: AlbumDetailHeroData = {
    id: 301,
    name: 'Album A',
    coverUrl: 'https://img.example.com/a.jpg',
    artistNames: 'Artist A / Artist B',
    publishTime: 1710000000000,
    trackCount: 12,
    description: 'desc',
  }

  assert.deepEqual(toAlbumListItem(hero), {
    id: 301,
    name: 'Album A',
    picUrl: 'https://img.example.com/a.jpg',
    blurPicUrl: 'https://img.example.com/a.jpg',
    artists: [{ name: 'Artist A' }, { name: 'Artist B' }],
    artist: { name: 'Artist A' },
  })
})

test('normalizeAlbumTracks uses album cover fallback when track cover is missing', () => {
  const tracks = normalizeAlbumTracks(
    {
      songs: [
        {
          id: 101,
          name: 'Track without cover',
          dt: 180000,
          al: { name: 'Album A' },
          ar: [{ id: 201, name: 'Artist A' }],
        },
        {
          id: 102,
          name: 'Track with cover',
          dt: 200000,
          al: {
            name: 'Album A',
            picUrl: 'https://img.example.com/track.jpg',
          },
          ar: [{ id: 201, name: 'Artist A' }],
        },
      ],
    },
    { fallbackCoverUrl: 'https://img.example.com/album.jpg' }
  )

  assert.equal(tracks[0].coverUrl, 'https://img.example.com/album.jpg')
  assert.equal(tracks[1].coverUrl, 'https://img.example.com/track.jpg')
  assert.deepEqual(tracks[0].artists, [{ id: 201, name: 'Artist A' }])
})
