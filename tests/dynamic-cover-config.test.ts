import test from 'node:test'
import assert from 'node:assert/strict'

import {
  defaultConfig,
  normalizeDynamicCoverEnabled,
} from '../src/main/config/types.ts'

test('dynamic cover effect defaults to enabled', () => {
  assert.equal(defaultConfig.dynamicCoverEnabled, true)
})

test('normalizeDynamicCoverEnabled preserves booleans and falls back for invalid values', () => {
  assert.equal(normalizeDynamicCoverEnabled(true), true)
  assert.equal(normalizeDynamicCoverEnabled(false), false)
  assert.equal(normalizeDynamicCoverEnabled(undefined), true)
  assert.equal(normalizeDynamicCoverEnabled('false'), true)
})
