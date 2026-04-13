import test from 'node:test'
import assert from 'node:assert/strict'

import {
  defaultConfig,
  normalizePlayerBackgroundMode,
} from '../src/main/config/types.ts'

test('player background defaults to static cover background', () => {
  assert.equal(defaultConfig.playerBackgroundMode, 'static')
})

test('normalizePlayerBackgroundMode preserves supported values and falls back for invalid values', () => {
  assert.equal(normalizePlayerBackgroundMode('off'), 'off')
  assert.equal(normalizePlayerBackgroundMode('static'), 'static')
  assert.equal(normalizePlayerBackgroundMode('dynamic'), 'dynamic')
  assert.equal(normalizePlayerBackgroundMode(undefined), 'static')
  assert.equal(normalizePlayerBackgroundMode('enabled'), 'static')
})
