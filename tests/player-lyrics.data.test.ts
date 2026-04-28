import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createLyricCacheKey,
  hasLyricTextBundle,
  readLyricField,
  readLyricTextBundle,
} from '../src/renderer/components/PlayerScene/player-lyrics.data.ts'

test('readLyricField returns lyric text only for object payloads', () => {
  assert.equal(readLyricField({ lyric: '[00:00.00]line' }), '[00:00.00]line')
  assert.equal(readLyricField({ lyric: 123 }), '')
  assert.equal(readLyricField(null), '')
})

test('readLyricTextBundle supports nested lyric payloads', () => {
  assert.deepEqual(
    readLyricTextBundle({
      data: {
        lrc: { lyric: '[00:01.00]Original' },
        tlyric: { lyric: '[00:01.00]Translation' },
        yrc: { lyric: '[1000,1200](0,600,0)Ori(600,600,0)ginal' },
      },
    }),
    {
      lrc: '[00:01.00]Original',
      tlyric: '[00:01.00]Translation',
      yrc: '[1000,1200](0,600,0)Ori(600,600,0)ginal',
    }
  )
})

test('readLyricTextBundle supports lx lyric result shapes', () => {
  assert.deepEqual(readLyricTextBundle('[00:01.00]LX line'), {
    lrc: '[00:01.00]LX line',
    tlyric: '',
    yrc: '',
  })

  assert.deepEqual(readLyricTextBundle({ lyric: '[00:02.00]Direct field' }), {
    lrc: '[00:02.00]Direct field',
    tlyric: '',
    yrc: '',
  })
})

test('hasLyricTextBundle detects whether any lyric field is present', () => {
  assert.equal(hasLyricTextBundle({ lrc: '', tlyric: '', yrc: '' }), false)
  assert.equal(
    hasLyricTextBundle({ lrc: '', tlyric: '[00:01.00]Translation', yrc: '' }),
    true
  )
})

test('createLyricCacheKey namespaces lyric cache entries by source and track id', () => {
  assert.equal(createLyricCacheKey(1824020871), 'lyrics:wy:1824020871')
  assert.equal(createLyricCacheKey(1139129604, 'tx'), 'lyrics:tx:1139129604')
})
