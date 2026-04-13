import test from 'node:test'
import assert from 'node:assert/strict'

import {
  defaultConfig,
  normalizeDiskCacheDir,
  normalizeDiskCacheEnabled,
  normalizeDiskCacheMaxBytes,
  normalizeLyricsKaraokeEnabled,
  normalizePlaybackSpeed,
  normalizeShowLyricTranslation,
} from '../src/main/config/types.ts'

test('new config defaults are safe for playback, lyrics, and cache', () => {
  assert.equal(defaultConfig.playbackSpeed, 1)
  assert.equal(defaultConfig.showLyricTranslation, false)
  assert.equal(defaultConfig.lyricsKaraokeEnabled, true)
  assert.equal(defaultConfig.diskCacheEnabled, false)
  assert.equal(defaultConfig.diskCacheDir, '')
  assert.equal(defaultConfig.diskCacheMaxBytes, 1024 * 1024 * 1024)
})

test('normalizePlaybackSpeed clamps to the supported range and falls back for invalid values', () => {
  assert.equal(normalizePlaybackSpeed(0.5), 0.5)
  assert.equal(normalizePlaybackSpeed(1), 1)
  assert.equal(normalizePlaybackSpeed(2), 2)
  assert.equal(normalizePlaybackSpeed(3), 2)
  assert.equal(normalizePlaybackSpeed(0.1), 0.5)
  assert.equal(normalizePlaybackSpeed(Number.NaN), 1)
  assert.equal(normalizePlaybackSpeed('1.5'), 1)
})

test('normalizeShowLyricTranslation preserves booleans and falls back for invalid values', () => {
  assert.equal(normalizeShowLyricTranslation(true), true)
  assert.equal(normalizeShowLyricTranslation(false), false)
  assert.equal(normalizeShowLyricTranslation(undefined), false)
  assert.equal(normalizeShowLyricTranslation('true'), false)
})

test('normalizeLyricsKaraokeEnabled preserves booleans and falls back for invalid values', () => {
  assert.equal(normalizeLyricsKaraokeEnabled(true), true)
  assert.equal(normalizeLyricsKaraokeEnabled(false), false)
  assert.equal(normalizeLyricsKaraokeEnabled(undefined), true)
  assert.equal(normalizeLyricsKaraokeEnabled(1), true)
})

test('normalizeDiskCacheEnabled preserves booleans and falls back for invalid values', () => {
  assert.equal(normalizeDiskCacheEnabled(true), true)
  assert.equal(normalizeDiskCacheEnabled(false), false)
  assert.equal(normalizeDiskCacheEnabled(undefined), false)
  assert.equal(normalizeDiskCacheEnabled('false'), false)
})

test('normalizeDiskCacheDir preserves strings and falls back for invalid values', () => {
  assert.equal(normalizeDiskCacheDir('C:\\cache'), 'C:\\cache')
  assert.equal(normalizeDiskCacheDir(''), '')
  assert.equal(normalizeDiskCacheDir(undefined), '')
  assert.equal(normalizeDiskCacheDir(null), '')
})

test('normalizeDiskCacheMaxBytes keeps positive numbers and falls back for invalid values', () => {
  assert.equal(normalizeDiskCacheMaxBytes(512 * 1024 * 1024), 512 * 1024 * 1024)
  assert.equal(
    normalizeDiskCacheMaxBytes(2.75 * 1024 * 1024 * 1024),
    Math.floor(2.75 * 1024 * 1024 * 1024)
  )
  assert.equal(normalizeDiskCacheMaxBytes(0), 1024 * 1024 * 1024)
  assert.equal(normalizeDiskCacheMaxBytes(-1), 1024 * 1024 * 1024)
  assert.equal(normalizeDiskCacheMaxBytes(Number.NaN), 1024 * 1024 * 1024)
})
