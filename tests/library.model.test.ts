import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeLibrarySongs,
  normalizeLibraryUserPlaylists,
  resolveLibraryLikedSongIds,
  resolveLibraryLikedPlaylist,
} from '../src/renderer/pages/Library/library.model.ts'

test('normalizeLibraryUserPlaylists returns only created playlists for my source', () => {
  const playlists = normalizeLibraryUserPlaylists(
    {
      data: {
        playlist: [
          {
            id: 1,
            name: '我喜欢的音乐',
            coverImgUrl: 'liked.jpg',
            specialType: 5,
            subscribed: false,
          },
          {
            id: 2,
            name: '我创建的歌单',
            coverImgUrl: 'my.jpg',
            trackCount: 8,
            subscribed: false,
          },
          {
            id: 3,
            name: '我收藏的歌单',
            coverImgUrl: 'subscribed.jpg',
            trackCount: 16,
            subscribed: true,
          },
        ],
      },
    },
    'my'
  )

  assert.deepEqual(playlists, [
    {
      id: 2,
      name: '我创建的歌单',
      coverUrl: 'my.jpg',
      subtitle: '网易云音乐推荐',
      trackCount: 8,
      playCount: 0,
    },
  ])
})

test('normalizeLibraryUserPlaylists returns only subscribed playlists for subscribed source', () => {
  const playlists = normalizeLibraryUserPlaylists(
    {
      playlist: [
        {
          id: 1,
          name: '我喜欢的音乐',
          coverImgUrl: 'liked.jpg',
          specialType: 5,
          subscribed: false,
        },
        {
          id: 2,
          name: '我创建的歌单',
          coverImgUrl: 'my.jpg',
          trackCount: 8,
          subscribed: false,
        },
        {
          id: 3,
          name: '我收藏的歌单',
          coverImgUrl: 'subscribed.jpg',
          trackCount: 16,
          subscribed: true,
          creator: { nickname: '收藏来源' },
        },
      ],
    },
    'subscribed'
  )

  assert.deepEqual(playlists, [
    {
      id: 3,
      name: '我收藏的歌单',
      coverUrl: 'subscribed.jpg',
      subtitle: '收藏来源',
      trackCount: 16,
      playCount: 0,
    },
  ])
})

test('resolveLibraryLikedPlaylist picks liked playlist by specialType', () => {
  const playlist = resolveLibraryLikedPlaylist({
    playlist: [
      {
        id: 99,
        name: '别的歌单',
        coverImgUrl: 'other.jpg',
        trackCount: 3,
      },
      {
        id: 100,
        name: '我喜欢的音乐',
        coverImgUrl: 'liked.jpg',
        trackCount: 12,
        specialType: 5,
      },
    ],
  })

  assert.deepEqual(playlist, {
    id: 100,
    trackCount: 12,
    coverImgUrl: 'liked.jpg',
  })
})

test('resolveLibraryLikedSongIds unwraps nested ids payload', () => {
  const ids = resolveLibraryLikedSongIds({
    data: {
      data: {
        ids: [101, 102, 103],
      },
    },
  })

  assert.deepEqual(ids, [101, 102, 103])
})

test('resolveLibraryLikedSongIds falls back to idsData payload', () => {
  const ids = resolveLibraryLikedSongIds({
    idsData: [201, 202],
  })

  assert.deepEqual(ids, [201, 202])
})

test('normalizeLibrarySongs preserves artist ids for track list artist navigation', () => {
  const songs = normalizeLibrarySongs({
    songs: [
      {
        id: 501,
        name: 'Library Song',
        dt: 190000,
        al: {
          name: 'Library Album',
          picUrl: 'https://img.example.com/library.jpg',
        },
        ar: [
          { id: 7001, name: 'Library Artist A' },
          { id: 7002, name: 'Library Artist B' },
        ],
      },
    ],
  })

  assert.deepEqual(songs[0], {
    id: 501,
    name: 'Library Song',
    artistNames: 'Library Artist A / Library Artist B',
    artists: [
      { id: 7001, name: 'Library Artist A' },
      { id: 7002, name: 'Library Artist B' },
    ],
    albumName: 'Library Album',
    coverUrl: 'https://img.example.com/library.jpg',
    duration: 190000,
  })
})
