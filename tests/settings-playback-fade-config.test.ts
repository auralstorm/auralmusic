import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  defaultConfig,
  normalizePlaybackFadeEnabled,
} from '../src/shared/config.ts'

const basicSettingsSource = readFileSync(
  new URL(
    '../src/renderer/pages/Settings/components/BasicSettings.tsx',
    import.meta.url
  ),
  'utf8'
)

test('playback fade defaults to disabled', () => {
  assert.equal(defaultConfig.playbackFadeEnabled, false)
})

test('normalizePlaybackFadeEnabled preserves booleans and falls back for invalid values', () => {
  assert.equal(normalizePlaybackFadeEnabled(true), true)
  assert.equal(normalizePlaybackFadeEnabled(false), false)
  assert.equal(normalizePlaybackFadeEnabled('yes'), false)
})

test('basic settings exposes playback fade toggle', () => {
  assert.match(basicSettingsSource, /playbackFadeEnabled/)
  assert.match(basicSettingsSource, /setConfig\('playbackFadeEnabled'/)
  assert.match(basicSettingsSource, /播放淡入淡出效果/)
})
