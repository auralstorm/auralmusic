import test from 'node:test'
import assert from 'node:assert/strict'

import {
  defaultConfig,
  normalizePlayerArtworkStyle,
  PLAYER_ARTWORK_STYLE_OPTIONS,
} from '../src/main/config/types.ts'

test('player artwork style defaults to the existing cover layout', () => {
  assert.equal(defaultConfig.playerArtworkStyle, 'default')
})

test('normalizePlayerArtworkStyle preserves supported values and falls back for invalid values', () => {
  assert.equal(normalizePlayerArtworkStyle('default'), 'default')
  assert.equal(normalizePlayerArtworkStyle('vinylRecord'), 'vinylRecord')
  assert.equal(normalizePlayerArtworkStyle('holographicCd'), 'holographicCd')
  assert.equal(normalizePlayerArtworkStyle(undefined), 'default')
  assert.equal(normalizePlayerArtworkStyle('cassette'), 'default')
})

test('player artwork style options stay aligned with persisted values', () => {
  assert.deepEqual(
    PLAYER_ARTWORK_STYLE_OPTIONS.map(option => option.value),
    ['default', 'vinylRecord', 'holographicCd']
  )
})
