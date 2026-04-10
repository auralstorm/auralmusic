import test from 'node:test'
import assert from 'node:assert/strict'

import {
  toArtistListItem,
  type ArtistDetailProfile,
} from './src/renderer/pages/Artists/artist-detail.model.ts'

test('toArtistListItem maps artist detail profile into artist list item', () => {
  const profile: ArtistDetailProfile = {
    id: 2048,
    name: 'Artist A',
    coverUrl: 'https://img.example.com/artist-a.jpg',
    musicSize: 18,
    albumSize: 4,
    mvSize: 2,
    identity: 'Singer',
  }

  assert.deepEqual(toArtistListItem(profile), {
    id: 2048,
    name: 'Artist A',
    picUrl: 'https://img.example.com/artist-a.jpg',
    albumSize: 4,
    musicSize: 18,
  })
})
