import test from 'node:test'
import assert from 'node:assert/strict'

import {
  SEARCH_TYPE_CODE_MAP,
  buildSearchResultTargetPath,
  normalizeBuiltinSearchResults,
  normalizeSearchResults,
} from '../src/renderer/components/SearchDialog/search-dialog.model.ts'
import { createSystemSearchSourceTab } from '../src/renderer/components/SearchDialog/model/search-source-tabs.model.ts'

test('SEARCH_TYPE_CODE_MAP exposes the supported cloudsearch codes', () => {
  assert.deepEqual(SEARCH_TYPE_CODE_MAP, {
    song: 1,
    album: 10,
    artist: 100,
    playlist: 1000,
    mv: 1004,
  })
})

test('createSystemSearchSourceTab returns the built-in NetEase tab', () => {
  assert.deepEqual(createSystemSearchSourceTab(), {
    id: 'wy',
    name: '网易云',
    providerType: 'builtin',
  })
})

test('normalizeSearchResults maps system song payloads into locked-platform playback rows', () => {
  const rows = normalizeSearchResults(
    {
      result: {
        songs: [
          {
            id: 101,
            name: 'Northern Lights',
            dt: 245000,
            fee: 1,
            ar: [{ name: 'Aurora Echo' }],
            al: {
              id: 808,
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
      durationLabel: '04:05',
      qualityLabel: '',
      targetId: 101,
      disabled: false,
      playbackTrack: {
        id: 101,
        name: 'Northern Lights',
        artistNames: 'Aurora Echo',
        albumName: 'Midnight Signals',
        coverUrl: 'https://img.example.com/song.jpg',
        duration: 245000,
        fee: 1,
        lockedPlatform: 'wy',
        lxInfo: {
          songmid: 101,
          hash: '101',
          strMediaMid: '101',
          copyrightId: '101',
          albumId: 808,
          source: 'wy',
          img: 'https://img.example.com/song.jpg',
        },
      },
    },
  ])
})

test('normalizeBuiltinSearchResults maps builtin provider payloads into locked-platform playback rows', () => {
  const rows = normalizeBuiltinSearchResults(
    {
      source: 'tx',
      page: 1,
      limit: 20,
      total: 1,
      list: [
        {
          id: 123,
          name: 'Faded',
          artistNames: 'Alan Walker',
          albumName: 'Faded',
          coverUrl: 'https://img.example.com/faded.jpg',
          duration: 212000,
          fee: 0,
          qualityLabel: 'SQ',
          lxInfo: {
            songmid: '004Z8Ihr0JIu5s',
            strMediaMid: '001Qu4I30eVFYb',
            source: 'tx',
            img: 'https://img.example.com/faded.jpg',
          },
        },
      ],
    },
    {
      id: 'tx',
      name: 'QQ',
      providerType: 'builtin',
    }
  )

  assert.deepEqual(rows, [
    {
      id: 123,
      type: 'song',
      name: 'Faded',
      artistName: 'Alan Walker',
      coverUrl: 'https://img.example.com/faded.jpg',
      durationLabel: '03:32',
      qualityLabel: 'SQ',
      targetId: 123,
      disabled: false,
      searchSourceId: 'tx',
      searchSourceName: 'QQ',
      playbackTrack: {
        id: 123,
        name: 'Faded',
        artistNames: 'Alan Walker',
        albumName: 'Faded',
        coverUrl: 'https://img.example.com/faded.jpg',
        duration: 212000,
        fee: 0,
        lockedPlatform: 'tx',
        lxInfo: {
          songmid: '004Z8Ihr0JIu5s',
          strMediaMid: '001Qu4I30eVFYb',
          source: 'tx',
          img: 'https://img.example.com/faded.jpg',
        },
      },
    },
  ])
})

test('normalizeSearchResults maps artist payloads into navigable rows', () => {
  const rows = normalizeSearchResults(
    {
      result: {
        artists: [
          {
            id: 505,
            name: 'Wave Singer',
            picUrl: 'https://img.example.com/artist.jpg',
            albumSize: 12,
            mvSize: 3,
          },
        ],
      },
    },
    'artist'
  )

  assert.deepEqual(rows, [
    {
      id: 505,
      type: 'artist',
      name: 'Wave Singer',
      artistName: '12 张专辑 · 3 个 MV',
      coverUrl: 'https://img.example.com/artist.jpg',
      durationLabel: '',
      qualityLabel: '',
      targetId: 505,
      disabled: false,
      playbackTrack: null,
    },
  ])
})

test('buildSearchResultTargetPath returns detail routes for navigable resources', () => {
  assert.equal(buildSearchResultTargetPath('album', 202), '/albums/202')
  assert.equal(buildSearchResultTargetPath('artist', 505), '/artists/505')
  assert.equal(buildSearchResultTargetPath('playlist', 303), '/playlist/303')
  assert.equal(buildSearchResultTargetPath('song', 101), null)
  assert.equal(buildSearchResultTargetPath('mv', 404), null)
})
