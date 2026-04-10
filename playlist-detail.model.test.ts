import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizePlaylistDetailHero } from './src/renderer/pages/PlayList/Detail/playlist-detail.model.ts'

test('normalizePlaylistDetailHero maps creator user id from playlist detail payload', () => {
  const hero = normalizePlaylistDetailHero({
    playlist: {
      id: 801,
      name: 'My Playlist',
      coverImgUrl: 'https://img.example.com/playlist.jpg',
      description: 'desc',
      updateTime: 1710000000000,
      trackCount: 32,
      creator: {
        nickname: 'Creator A',
        userId: 9527,
      },
    },
  })

  assert.deepEqual(hero, {
    id: 801,
    name: 'My Playlist',
    coverUrl: 'https://img.example.com/playlist.jpg',
    creatorName: 'Creator A',
    creatorUserId: 9527,
    description: 'desc',
    updateTime: 1710000000000,
    trackCount: 32,
  })
})

test('normalizePlaylistDetailHero falls back to null creator user id when creator is missing', () => {
  const hero = normalizePlaylistDetailHero({
    playlist: {
      id: 802,
      name: 'Other Playlist',
    },
  })

  assert.equal(hero?.creatorUserId, null)
})
