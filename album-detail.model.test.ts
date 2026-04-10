import test from 'node:test'
import assert from 'node:assert/strict'

import {
  toAlbumListItem,
  type AlbumDetailHeroData,
} from './src/renderer/pages/Albums/Detail/album-detail.model.ts'

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
