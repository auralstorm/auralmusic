import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_PLAYBACK_FADE_DURATION_MS,
  shouldFadePlaybackPause,
  shouldFadePlaybackStart,
  shouldFadeTrackTransition,
} from '../src/renderer/audio/playback-runtime/playback-fade.model.ts'

test('playback fade model uses a short default duration', () => {
  assert.equal(DEFAULT_PLAYBACK_FADE_DURATION_MS, 500)
})

test('playback fade start requires config enabled and a valid loaded source', () => {
  assert.equal(
    shouldFadePlaybackStart({ enabled: true, hasSource: true }),
    true
  )
  assert.equal(
    shouldFadePlaybackStart({ enabled: false, hasSource: true }),
    false
  )
  assert.equal(
    shouldFadePlaybackStart({ enabled: true, hasSource: false }),
    false
  )
})

test('playback fade pause requires config enabled and a valid loaded source', () => {
  assert.equal(
    shouldFadePlaybackPause({ enabled: true, hasSource: true }),
    true
  )
  assert.equal(
    shouldFadePlaybackPause({ enabled: false, hasSource: true }),
    false
  )
  assert.equal(
    shouldFadePlaybackPause({ enabled: true, hasSource: false }),
    false
  )
})

test('track transition fade requires an active source and enabled config', () => {
  assert.equal(
    shouldFadeTrackTransition({ enabled: true, hasActiveSource: true }),
    true
  )
  assert.equal(
    shouldFadeTrackTransition({ enabled: true, hasActiveSource: false }),
    false
  )
})
