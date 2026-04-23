import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveRetroPresetPipeline } from '../src/renderer/components/PlayerScene/player-scene-retro.model.ts'

test('resolveRetroPresetPipeline returns stable pipeline for all presets', () => {
  const presets = [
    'off',
    'ccd',
    'kodak90s',
    'y2k',
    'hkCinema',
    'desaturatedFilm',
    'vinylClassic',
    'crt',
    'polaroid',
  ] as const

  presets.forEach(preset => {
    const pipeline = resolveRetroPresetPipeline(preset)
    assert.ok(pipeline)
    assert.equal(typeof pipeline.blurStrength, 'number')
    assert.equal(typeof pipeline.noiseIntensity, 'number')
    assert.equal(typeof pipeline.overlay.vignetteAlpha, 'number')
  })
})

test('crt preset keeps flicker in a mild range to reduce visual fatigue', () => {
  const pipeline = resolveRetroPresetPipeline('crt')
  assert.ok(pipeline.flickerAmplitude > 0)
  assert.ok(pipeline.flickerAmplitude <= 0.04)
})

test('resolveRetroPresetPipeline returns isolated copies for future preset tuning', () => {
  const pipeline = resolveRetroPresetPipeline('ccd')
  pipeline.overlay.vignetteAlpha = 0.99
  pipeline.color.brightness = 9

  const nextPipeline = resolveRetroPresetPipeline('ccd')
  assert.notEqual(nextPipeline.overlay.vignetteAlpha, 0.99)
  assert.notEqual(nextPipeline.color.brightness, 9)
})

test('vinyl classic preset deepens worn edges without aggressive light leaks', () => {
  const pipeline = resolveRetroPresetPipeline('vinylClassic')
  assert.ok(pipeline.overlay.vignetteAlpha >= 0.3)
  assert.ok(pipeline.overlay.wearAlpha > 0)
  assert.equal(pipeline.overlay.lightLeakAlpha, 0)
  assert.ok(pipeline.noiseIntensity >= 0.1)
})
