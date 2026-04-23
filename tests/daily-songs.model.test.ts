import test from 'node:test'
import assert from 'node:assert/strict'

import {
  formatDailySongDuration,
  normalizeDailySongs,
} from '../src/renderer/pages/DailySongs/daily-songs.model.ts'

test('normalizeDailySongs maps recommend songs payload into list items', () => {
  const songs = normalizeDailySongs({
    dailySongs: [
      {
        id: 1,
        name: 'song title',
        dt: 245000,
        al: {
          name: 'album title',
          picUrl: 'https://img.example.com/song.jpg',
        },
        ar: [
          { id: 11, name: 'Artist A' },
          { id: 22, name: 'Artist B' },
        ],
      },
    ],
  })

  assert.deepEqual(songs, [
    {
      id: 1,
      name: 'song title',
      artistNames: 'Artist A / Artist B',
      artists: [
        { id: 11, name: 'Artist A' },
        { id: 22, name: 'Artist B' },
      ],
      albumName: 'album title',
      coverUrl: 'https://img.example.com/song.jpg',
      duration: 245000,
    },
  ])
})

test('formatDailySongDuration formats milliseconds as mm:ss', () => {
  assert.equal(formatDailySongDuration(245000), '04:05')
})
