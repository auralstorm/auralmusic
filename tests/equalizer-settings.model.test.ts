import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createEqualizerPresetOptions,
  createEqualizerSettingsDraft,
  formatEqualizerGainLabel,
  hasEqualizerBandGainChanged,
  hasEqualizerPreampChanged,
  resolveEqualizerPresetLabel,
  resolveEqualizerSliderCommitValue,
} from '../src/renderer/pages/Settings/components/equalizer-settings.model.ts'
import { DEFAULT_EQUALIZER_CONFIG } from '../src/shared/equalizer.ts'

test('createEqualizerSettingsDraft clones bands and keeps normalized defaults', () => {
  const draft = createEqualizerSettingsDraft(DEFAULT_EQUALIZER_CONFIG)
  draft.bands[0]!.gain = 6

  assert.equal(DEFAULT_EQUALIZER_CONFIG.bands[0]?.gain, 0)
  assert.equal(draft.preamp, 0)
})

test('equalizer settings model formats labels and commit values safely', () => {
  assert.equal(formatEqualizerGainLabel(3.5), '+3.5 dB')
  assert.equal(formatEqualizerGainLabel(-99), '-12.0 dB')
  assert.equal(resolveEqualizerSliderCommitValue([99]), 12)
  assert.equal(resolveEqualizerSliderCommitValue([]), 0)
})

test('equalizer preset labels expose custom state for the UI', () => {
  assert.equal(resolveEqualizerPresetLabel('rock'), '摇滚')
  assert.equal(resolveEqualizerPresetLabel('custom'), '自定义')
  assert.deepEqual(createEqualizerPresetOptions('custom').at(-1), {
    value: 'custom',
    label: '自定义',
  })
})

test('equalizer settings model detects whether commit values actually changed', () => {
  assert.equal(hasEqualizerPreampChanged(DEFAULT_EQUALIZER_CONFIG, 0), false)
  assert.equal(hasEqualizerPreampChanged(DEFAULT_EQUALIZER_CONFIG, -3), true)
  assert.equal(
    hasEqualizerBandGainChanged(DEFAULT_EQUALIZER_CONFIG, 31, 0),
    false
  )
  assert.equal(
    hasEqualizerBandGainChanged(DEFAULT_EQUALIZER_CONFIG, 31, 4),
    true
  )
})
