import test from 'node:test'
import assert from 'node:assert/strict'

import {
  defaultConfig,
  normalizeDynamicCoverEnabled,
  normalizeRetroCoverPreset,
  RETRO_COVER_PRESET_OPTIONS,
} from '../src/main/config/types.ts'

test('dynamic cover effect defaults to enabled', () => {
  assert.equal(defaultConfig.dynamicCoverEnabled, true)
  assert.equal(defaultConfig.retroCoverPreset, 'off')
})

test('normalizeDynamicCoverEnabled preserves booleans and falls back for invalid values', () => {
  assert.equal(normalizeDynamicCoverEnabled(true), true)
  assert.equal(normalizeDynamicCoverEnabled(false), false)
  assert.equal(normalizeDynamicCoverEnabled(undefined), true)
  assert.equal(normalizeDynamicCoverEnabled('false'), true)
})

test('normalizeRetroCoverPreset preserves supported values and falls back for invalid values', () => {
  assert.equal(normalizeRetroCoverPreset('off'), 'off')
  assert.equal(normalizeRetroCoverPreset('ccd'), 'ccd')
  assert.equal(normalizeRetroCoverPreset('kodak90s'), 'kodak90s')
  assert.equal(normalizeRetroCoverPreset('y2k'), 'y2k')
  assert.equal(normalizeRetroCoverPreset('hkCinema'), 'hkCinema')
  assert.equal(normalizeRetroCoverPreset('desaturatedFilm'), 'desaturatedFilm')
  assert.equal(normalizeRetroCoverPreset('vinylClassic'), 'vinylClassic')
  assert.equal(normalizeRetroCoverPreset('crt'), 'crt')
  assert.equal(normalizeRetroCoverPreset('polaroid'), 'polaroid')
  assert.equal(normalizeRetroCoverPreset(undefined), 'off')
  assert.equal(normalizeRetroCoverPreset('classic'), 'off')
})

test('retro cover preset options stay aligned with persisted preset values', () => {
  assert.deepEqual(
    RETRO_COVER_PRESET_OPTIONS.map(option => option.value),
    [
      'off',
      'ccd',
      'kodak90s',
      'y2k',
      'hkCinema',
      'desaturatedFilm',
      'vinylClassic',
      'crt',
      'polaroid',
    ]
  )
})
