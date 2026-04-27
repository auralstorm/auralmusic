import assert from 'node:assert/strict'
import test from 'node:test'

import { shouldShowNativeCoverFallback } from '../src/renderer/components/PlayerScene/player-scene-artwork.model.ts'

test('native cover fallback is shown only after pixi texture load fails with a valid source', () => {
  assert.equal(
    shouldShowNativeCoverFallback('https://img.example.com/a.jpg', true),
    true
  )
  assert.equal(
    shouldShowNativeCoverFallback('https://img.example.com/a.jpg', false),
    false
  )
  assert.equal(shouldShowNativeCoverFallback('', true), false)
})
