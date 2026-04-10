import test from 'node:test'
import assert from 'node:assert/strict'

import {
  filterLikedSongsListItems,
  filterVisibleSongItems,
} from './src/shared/liked-song-visibility.ts'

test('filterVisibleSongItems removes songs hidden from liked songs list', () => {
  const songs = [
    { id: 101, name: 'A' },
    { id: 102, name: 'B' },
    { id: 103, name: 'C' },
  ]

  const visibleSongs = filterVisibleSongItems(songs, new Set([102]))

  assert.deepEqual(visibleSongs, [
    { id: 101, name: 'A' },
    { id: 103, name: 'C' },
  ])
})

test('filterLikedSongsListItems keeps only liked songs after liked ids are loaded', () => {
  const songs = [
    { id: 201, name: 'A' },
    { id: 202, name: 'B' },
    { id: 203, name: 'C' },
  ]

  const visibleSongs = filterLikedSongsListItems(
    songs,
    new Set([201, 203]),
    true,
    new Set()
  )

  assert.deepEqual(visibleSongs, [
    { id: 201, name: 'A' },
    { id: 203, name: 'C' },
  ])
})
