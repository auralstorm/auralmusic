import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_EQUALIZER_CONFIG,
  EQ_BANDS,
  EQ_PRESETS,
  applyEqualizerPreset,
  normalizeEqualizerConfig,
  updateEqualizerBandGain,
  updateEqualizerPreamp,
} from '../src/shared/equalizer.ts'

test('equalizer defaults define a flat 10-band profile', () => {
  assert.equal(EQ_BANDS.length, 10)
  assert.deepEqual(
    DEFAULT_EQUALIZER_CONFIG.bands.map(band => band.frequency),
    EQ_BANDS.map(band => band.frequency)
  )
  assert.equal(DEFAULT_EQUALIZER_CONFIG.enabled, false)
  assert.equal(DEFAULT_EQUALIZER_CONFIG.presetId, 'flat')
  assert.equal(DEFAULT_EQUALIZER_CONFIG.preamp, 0)
  assert.deepEqual(
    DEFAULT_EQUALIZER_CONFIG.bands.map(band => band.gain),
    EQ_BANDS.map(() => 0)
  )
})

test('normalizeEqualizerConfig clamps invalid values and keeps known presets', () => {
  const normalized = normalizeEqualizerConfig({
    enabled: true,
    presetId: 'vocal',
    preamp: 99,
    bands: [
      { frequency: 31, gain: -99 },
      { frequency: 62, gain: 6 },
      { frequency: 123456, gain: 12 },
    ],
  })

  assert.equal(normalized.enabled, true)
  assert.equal(normalized.presetId, 'vocal')
  assert.equal(normalized.preamp, 12)
  assert.equal(normalized.bands[0]?.gain, -12)
  assert.equal(normalized.bands[1]?.gain, 6)
  assert.equal(normalized.bands[2]?.frequency, 125)
  assert.equal(normalized.bands[2]?.gain, 0)
})

test('applyEqualizerPreset returns preset bands and preserves enabled state', () => {
  const nextConfig = applyEqualizerPreset(
    {
      ...DEFAULT_EQUALIZER_CONFIG,
      enabled: true,
      preamp: -3,
    },
    'bass-boost'
  )
  const preset = EQ_PRESETS.find(item => item.id === 'bass-boost')

  assert.equal(nextConfig.enabled, true)
  assert.equal(nextConfig.presetId, 'bass-boost')
  assert.equal(nextConfig.preamp, preset?.preamp)
  assert.deepEqual(nextConfig.bands, preset?.bands)
})

test('applyEqualizerPreset falls back to flat for unknown preset ids', () => {
  const nextConfig = applyEqualizerPreset(
    DEFAULT_EQUALIZER_CONFIG,
    'unknown-preset'
  )

  assert.equal(nextConfig.presetId, 'flat')
  assert.deepEqual(nextConfig.bands, DEFAULT_EQUALIZER_CONFIG.bands)
})

test('manual equalizer edits switch to custom preset and clamp values', () => {
  const bandEdited = updateEqualizerBandGain(DEFAULT_EQUALIZER_CONFIG, 31, 99)

  assert.equal(bandEdited.presetId, 'custom')
  assert.equal(bandEdited.bands[0]?.gain, 12)

  const preampEdited = updateEqualizerPreamp(DEFAULT_EQUALIZER_CONFIG, -99)
  assert.equal(preampEdited.presetId, 'custom')
  assert.equal(preampEdited.preamp, -12)
})
