import test from 'node:test'
import assert from 'node:assert/strict'

import {
  findActiveLyricIndex,
  parseLrc,
} from '../src/renderer/components/PlayerScene/player-lyrics.model.ts'

test('parseLrc parses standard lrc timestamps and text', () => {
  assert.deepEqual(
    parseLrc(`
[00:01.00]First line
[00:12.34]Second line
[01:02.003]Third line
`),
    [
      { time: 1000, text: 'First line' },
      { time: 12340, text: 'Second line' },
      { time: 62003, text: 'Third line' },
    ]
  )
})

test('parseLrc expands multiple timestamps on one lyric line', () => {
  assert.deepEqual(parseLrc('[00:03.00][00:05.50]Echo'), [
    { time: 3000, text: 'Echo' },
    { time: 5500, text: 'Echo' },
  ])
})

test('parseLrc ignores invalid and empty lyric lines', () => {
  assert.deepEqual(parseLrc('plain text\n[bad]Broken\n[00:01.00]'), [])
})

test('findActiveLyricIndex returns the current lyric line for progress', () => {
  const lines = [
    { time: 1000, text: 'First' },
    { time: 3000, text: 'Second' },
    { time: 5000, text: 'Third' },
  ]

  assert.equal(findActiveLyricIndex(lines, 500), -1)
  assert.equal(findActiveLyricIndex(lines, 1000), 0)
  assert.equal(findActiveLyricIndex(lines, 4200), 1)
  assert.equal(findActiveLyricIndex(lines, 9999), 2)
})
