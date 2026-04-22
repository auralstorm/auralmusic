import {
  EQ_GAIN_MAX,
  EQ_GAIN_MIN,
  EQ_PRESETS,
  normalizeEqualizerConfig,
  type EqualizerBandFrequency,
  type EqualizerConfig,
} from '../../../../shared/equalizer.ts'
import type { EqualizerPresetOption } from '../types'

export const EQUALIZER_SLIDER_MIN = EQ_GAIN_MIN
export const EQUALIZER_SLIDER_MAX = EQ_GAIN_MAX
export const EQUALIZER_SLIDER_STEP = 0.5

const EQUALIZER_PRESET_LABELS: Record<string, string> = {
  flat: '平直',
  'bass-boost': '低音增强',
  'treble-boost': '高音增强',
  vocal: '人声增强',
  rock: '摇滚',
  pop: '流行',
  classical: '古典',
  jazz: '爵士',
  electronic: '电子',
  custom: '自定义',
}

function clampEqualizerValue(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }

  return Math.min(EQUALIZER_SLIDER_MAX, Math.max(EQUALIZER_SLIDER_MIN, value))
}

export function createEqualizerSettingsDraft(config: unknown): EqualizerConfig {
  const normalizedConfig = normalizeEqualizerConfig(config)

  return {
    ...normalizedConfig,
    bands: normalizedConfig.bands.map(band => ({ ...band })),
  }
}

export function resolveEqualizerSliderCommitValue(value: number[]) {
  return clampEqualizerValue(value[0])
}

export function hasEqualizerBandGainChanged(
  config: EqualizerConfig,
  frequency: EqualizerBandFrequency,
  gain: number
) {
  const normalizedConfig = normalizeEqualizerConfig(config)
  const normalizedGain = clampEqualizerValue(gain)

  return (
    normalizedConfig.bands.find(band => band.frequency === frequency)?.gain !==
    normalizedGain
  )
}

export function hasEqualizerPreampChanged(
  config: EqualizerConfig,
  preamp: number
) {
  return normalizeEqualizerConfig(config).preamp !== clampEqualizerValue(preamp)
}

export function formatEqualizerGainLabel(value: unknown) {
  const normalizedValue = clampEqualizerValue(value)

  return `${normalizedValue > 0 ? '+' : ''}${normalizedValue.toFixed(1)} dB`
}

export function resolveEqualizerPresetLabel(presetId: string) {
  return (
    EQUALIZER_PRESET_LABELS[presetId] ??
    EQUALIZER_PRESET_LABELS[
      EQ_PRESETS.find(preset => preset.id === presetId)?.id ?? 'flat'
    ] ??
    '平直'
  )
}

export function createEqualizerPresetOptions(
  currentPresetId: string
): EqualizerPresetOption[] {
  const presetOptions = EQ_PRESETS.map(preset => ({
    value: preset.id,
    label: resolveEqualizerPresetLabel(preset.id),
  }))

  if (currentPresetId === 'custom') {
    return [
      ...presetOptions,
      {
        value: 'custom',
        label: resolveEqualizerPresetLabel('custom'),
      },
    ]
  }

  return presetOptions
}
