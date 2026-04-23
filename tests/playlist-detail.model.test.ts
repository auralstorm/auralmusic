import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizePlaylistDetailHero,
  normalizePlaylistTracks,
} from '../src/renderer/pages/PlayList/Detail/playlist-detail.model.ts'

test('normalizePlaylistDetailHero maps creator user id from playlist detail payload', () => {
  const hero = normalizePlaylistDetailHero({
    playlist: {
      id: 801,
      name: 'My Playlist',
      coverImgUrl: 'https://img.example.com/playlist.jpg',
      description: 'desc',
      updateTime: 1710000000000,
      trackCount: 32,
      subscribed: true,
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
    isSubscribed: true,
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
  assert.equal(hero?.isSubscribed, false)
})

test('normalizePlaylistTracks preserves artist ids for track list navigation', () => {
  const tracks = normalizePlaylistTracks({
    songs: [
      {
        id: 3001,
        name: 'Track A',
        dt: 201000,
        al: { name: 'Album A', picUrl: 'https://img.example.com/a.jpg' },
        ar: [
          { id: 1001, name: 'Artist A' },
          { id: 1002, name: 'Artist B' },
        ],
      },
    ],
  })

  assert.deepEqual(tracks[0], {
    id: 3001,
    name: 'Track A',
    artistNames: 'Artist A / Artist B',
    artists: [
      { id: 1001, name: 'Artist A' },
      { id: 1002, name: 'Artist B' },
    ],
    albumName: 'Album A',
    duration: 201000,
    coverUrl: 'https://img.example.com/a.jpg',
  })
})
