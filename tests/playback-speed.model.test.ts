import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyPlaybackSpeedToAudio,
  formatPlaybackSpeedLabel,
  normalizePlaybackSpeedValue,
  resolvePlaybackSpeedCommitValue,
  resolvePlaybackSpeedSliderValue,
} from '../src/renderer/pages/Settings/components/playback-speed.model.ts'

test('normalizePlaybackSpeedValue clamps to 0.5x-2.0x and falls back to 1.0x', () => {
  assert.equal(normalizePlaybackSpeedValue(0.5), 0.5)
  assert.equal(normalizePlaybackSpeedValue(1), 1)
  assert.equal(normalizePlaybackSpeedValue(2), 2)
  assert.equal(normalizePlaybackSpeedValue(0.1), 0.5)
  assert.equal(normalizePlaybackSpeedValue(2.8), 2)
  assert.equal(normalizePlaybackSpeedValue(Number.NaN), 1)
  assert.equal(normalizePlaybackSpeedValue('1.5'), 1)
})

test('formatPlaybackSpeedLabel always renders one decimal place', () => {
  assert.equal(formatPlaybackSpeedLabel(1), '1.0x')
  assert.equal(formatPlaybackSpeedLabel(1.25), '1.3x')
  assert.equal(formatPlaybackSpeedLabel(0.4), '0.5x')
})

test('resolvePlaybackSpeedSliderValue prefers drag state and normalizes both values', () => {
  assert.equal(resolvePlaybackSpeedSliderValue(1.2, null), 1.2)
  assert.equal(resolvePlaybackSpeedSliderValue(3, null), 2)
  assert.equal(resolvePlaybackSpeedSliderValue(1.2, 0.75), 0.75)
  assert.equal(resolvePlaybackSpeedSliderValue(1.2, 4), 2)
})

test('resolvePlaybackSpeedCommitValue normalizes first slider item', () => {
  assert.equal(resolvePlaybackSpeedCommitValue([1.75]), 1.75)
  assert.equal(resolvePlaybackSpeedCommitValue([9]), 2)
  assert.equal(resolvePlaybackSpeedCommitValue([]), 1)
})

test('applyPlaybackSpeedToAudio assigns normalized playbackRate', () => {
  const audio = { playbackRate: 1 }

  assert.equal(applyPlaybackSpeedToAudio(audio, 1.6), 1.6)
  assert.equal(audio.playbackRate, 1.6)

  assert.equal(applyPlaybackSpeedToAudio(audio, 99), 2)
  assert.equal(audio.playbackRate, 2)
})
