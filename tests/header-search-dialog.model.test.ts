import test from 'node:test'
import assert from 'node:assert/strict'

import {
  SEARCH_TYPE_CODE_MAP,
  normalizeSearchResults,
} from '../src/renderer/components/SearchDialog/search-dialog.model.ts'

test('SEARCH_TYPE_CODE_MAP exposes the supported cloudsearch codes', () => {
  assert.deepEqual(SEARCH_TYPE_CODE_MAP, {
    song: 1,
    album: 10,
    playlist: 1000,
    mv: 1004,
  })
})

test('normalizeSearchResults maps song payloads into playable rows', () => {
  const rows = normalizeSearchResults(
    {
      result: {
        songs: [
          {
            id: 101,
            name: 'Northern Lights',
            dt: 245000,
            ar: [{ name: 'Aurora Echo' }],
            al: {
              name: 'Midnight Signals',
              picUrl: 'https://img.example.com/song.jpg',
            },
          },
        ],
      },
    },
    'song'
  )

  assert.deepEqual(rows, [
    {
      id: 101,
      type: 'song',
      name: 'Northern Lights',
      artistName: 'Aurora Echo',
      coverUrl: 'https://img.example.com/song.jpg',
      targetId: 101,
      disabled: false,
      playbackTrack: {
        id: 101,
        name: 'Northern Lights',
        artistNames: 'Aurora Echo',
        albumName: 'Midnight Signals',
        coverUrl: 'https://img.example.com/song.jpg',
        duration: 245000,
      },
    },
  ])
})

test('normalizeSearchResults maps albums, playlists, and mvs into the shared row shape', () => {
  const albumRows = normalizeSearchResults(
    {
      result: {
        albums: [
          {
            id: 202,
            name: 'Moonline',
            picUrl: 'https://img.example.com/album.jpg',
            artist: { name: 'Night Pulse' },
            artists: [{ name: 'Night Pulse' }],
          },
        ],
      },
    },
    'album'
  )

  const playlistRows = normalizeSearchResults(
    {
      result: {
        playlists: [
          {
            id: 303,
            name: 'City Drive',
            coverImgUrl: 'https://img.example.com/playlist.jpg',
            creator: { nickname: 'Synth User' },
          },
        ],
      },
    },
    'playlist'
  )

  const mvRows = normalizeSearchResults(
    {
      result: {
        mvs: [
          {
            id: 404,
            name: 'Skyline',
            cover: 'https://img.example.com/mv.jpg',
            artistName: 'Nova',
          },
        ],
      },
    },
    'mv'
  )

  assert.deepEqual(albumRows[0], {
    id: 202,
    type: 'album',
    name: 'Moonline',
    artistName: 'Night Pulse',
    coverUrl: 'https://img.example.com/album.jpg',
    targetId: 202,
    disabled: false,
    playbackTrack: null,
  })

  assert.deepEqual(playlistRows[0], {
    id: 303,
    type: 'playlist',
    name: 'City Drive',
    artistName: 'Synth User',
    coverUrl: 'https://img.example.com/playlist.jpg',
    targetId: 303,
    disabled: false,
    playbackTrack: null,
  })

  assert.deepEqual(mvRows[0], {
    id: 404,
    type: 'mv',
    name: 'Skyline',
    artistName: 'Nova',
    coverUrl: 'https://img.example.com/mv.jpg',
    targetId: 404,
    disabled: true,
    playbackTrack: null,
  })
})
