import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolvePixelArcadeBlockSize,
  shouldSuppressWaterRipple,
} from '../src/renderer/components/PlayerScene/player-scene-pixel-crt.model.ts'

test('pixel arcade block sizing stays strong enough for obvious arcade-style pixels', () => {
  assert.ok(resolvePixelArcadeBlockSize({ width: 420, height: 420 }) >= 6)
  assert.ok(resolvePixelArcadeBlockSize({ width: 720, height: 720 }) >= 12)
})

test('pixel arcade preset suppresses water ripple distortion while crt keeps it', () => {
  assert.equal(shouldSuppressWaterRipple('pixelArcade'), true)
  assert.equal(shouldSuppressWaterRipple('crt'), false)
})
