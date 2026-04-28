/** 均衡器单个频段允许的最小增益，单位 dB。 */
export const EQ_GAIN_MIN = -12
/** 均衡器单个频段允许的最大增益，单位 dB。 */
export const EQ_GAIN_MAX = 12

/** 10 段图形均衡器频点，顺序同时决定 UI 滑块顺序和 WebAudio 节点顺序。 */
export const EQ_BANDS = [
  { frequency: 31, label: '31Hz' },
  { frequency: 62, label: '62Hz' },
  { frequency: 125, label: '125Hz' },
  { frequency: 250, label: '250Hz' },
  { frequency: 500, label: '500Hz' },
  { frequency: 1000, label: '1kHz' },
  { frequency: 2000, label: '2kHz' },
  { frequency: 4000, label: '4kHz' },
  { frequency: 8000, label: '8kHz' },
  { frequency: 16000, label: '16kHz' },
] as const

export type EqualizerBandFrequency = (typeof EQ_BANDS)[number]['frequency']

/** 单个频段的增益设置。 */
export interface EqualizerBandGain {
  frequency: EqualizerBandFrequency
  gain: number
}

/** 用户当前均衡器配置。 */
export interface EqualizerConfig {
  enabled: boolean
  presetId: string
  preamp: number
  bands: EqualizerBandGain[]
}

/** 内置均衡器预设。 */
export interface EqualizerPreset {
  id: string
  name: string
  preamp: number
  bands: EqualizerBandGain[]
}

/** 根据预设增益数组生成完整 10 段配置，缺失频段自动补 0。 */
function createBandGains(gains: number[]): EqualizerBandGain[] {
  return EQ_BANDS.map((band, index) => ({
    frequency: band.frequency,
    gain: clampEqualizerGain(gains[index] ?? 0),
  }))
}

/** 内置预设列表，preamp 会预留余量以降低削波风险。 */
export const EQ_PRESETS: EqualizerPreset[] = [
  {
    id: 'flat',
    name: 'Flat',
    preamp: 0,
    bands: createBandGains([]),
  },
  {
    id: 'bass-boost',
    name: 'Bass Boost',
    preamp: -2,
    bands: createBandGains([6, 5, 4, 2, 0, 0, 0, 0, 0, 0]),
  },
  {
    id: 'treble-boost',
    name: 'Treble Boost',
    preamp: -2,
    bands: createBandGains([0, 0, 0, 0, 0, 1, 2, 4, 5, 6]),
  },
  {
    id: 'vocal',
    name: 'Vocal',
    preamp: -1,
    bands: createBandGains([-2, -2, -1, 1, 3, 4, 3, 1, 0, -1]),
  },
  {
    id: 'rock',
    name: 'Rock',
    preamp: -3,
    bands: createBandGains([4, 3, 2, 0, -1, 1, 3, 4, 3, 2]),
  },
  {
    id: 'pop',
    name: 'Pop',
    preamp: -2,
    bands: createBandGains([-1, 2, 3, 3, 1, -1, -1, 2, 3, 3]),
  },
  {
    id: 'classical',
    name: 'Classical',
    preamp: -1,
    bands: createBandGains([2, 2, 1, 0, 0, 0, 1, 2, 3, 3]),
  },
  {
    id: 'jazz',
    name: 'Jazz',
    preamp: -2,
    bands: createBandGains([3, 2, 1, 2, -1, -1, 1, 2, 3, 2]),
  },
  {
    id: 'electronic',
    name: 'Electronic',
    preamp: -4,
    bands: createBandGains([5, 4, 2, 0, -2, 1, 2, 4, 5, 4]),
  },
]

/** 默认关闭均衡器，但保留 flat 预设结构便于 UI 直接绑定。 */
export const DEFAULT_EQUALIZER_CONFIG: EqualizerConfig = {
  enabled: false,
  presetId: 'flat',
  preamp: 0,
  bands: createBandGains([]),
}

/** 限制增益范围，防止配置文件手改后传入过大值造成爆音。 */
function clampEqualizerGain(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }

  return Math.min(EQ_GAIN_MAX, Math.max(EQ_GAIN_MIN, value))
}

/** 校验频段是否属于当前 10 段均衡器。 */
function isEqualizerBandFrequency(
  value: unknown
): value is EqualizerBandFrequency {
  return (
    typeof value === 'number' && EQ_BANDS.some(band => band.frequency === value)
  )
}

/** 预设 id 不存在时回退 flat，兼容旧版本或手改配置。 */
function normalizePresetId(value: unknown) {
  if (
    typeof value === 'string' &&
    EQ_PRESETS.some(preset => preset.id === value)
  ) {
    return value
  }

  return DEFAULT_EQUALIZER_CONFIG.presetId
}

/** 归一化均衡器配置，保证频段完整、顺序稳定、增益在安全范围内。 */
export function normalizeEqualizerConfig(value: unknown): EqualizerConfig {
  if (!value || typeof value !== 'object') {
    return DEFAULT_EQUALIZER_CONFIG
  }

  const input = value as Partial<EqualizerConfig>
  const inputBands = Array.isArray(input.bands) ? input.bands : []

  return {
    enabled:
      typeof input.enabled === 'boolean'
        ? input.enabled
        : DEFAULT_EQUALIZER_CONFIG.enabled,
    presetId: normalizePresetId(input.presetId),
    preamp: clampEqualizerGain(input.preamp),
    bands: EQ_BANDS.map(defaultBand => {
      const matchedBand = inputBands.find(band => {
        return isEqualizerBandFrequency(band?.frequency)
          ? band.frequency === defaultBand.frequency
          : false
      })

      return {
        frequency: defaultBand.frequency,
        gain: clampEqualizerGain(matchedBand?.gain),
      }
    }),
  }
}

/** 应用内置预设，但保留当前 enabled 状态，避免切预设时意外开关均衡器。 */
export function applyEqualizerPreset(
  currentConfig: EqualizerConfig,
  presetId: string
): EqualizerConfig {
  const preset =
    EQ_PRESETS.find(item => item.id === presetId) ??
    EQ_PRESETS.find(item => item.id === 'flat')!

  return {
    enabled: currentConfig.enabled,
    presetId: preset.id,
    preamp: preset.preamp,
    bands: preset.bands.map(band => ({ ...band })),
  }
}

/** 更新单个频段增益，并把 presetId 标记为 custom。 */
export function updateEqualizerBandGain(
  currentConfig: EqualizerConfig,
  frequency: EqualizerBandFrequency,
  gain: number
): EqualizerConfig {
  const normalizedConfig = normalizeEqualizerConfig(currentConfig)

  return {
    ...normalizedConfig,
    presetId: 'custom',
    bands: normalizedConfig.bands.map(band =>
      band.frequency === frequency
        ? { ...band, gain: clampEqualizerGain(gain) }
        : band
    ),
  }
}

/** 更新前置增益，并把 presetId 标记为 custom。 */
export function updateEqualizerPreamp(
  currentConfig: EqualizerConfig,
  preamp: number
): EqualizerConfig {
  return {
    ...normalizeEqualizerConfig(currentConfig),
    presetId: 'custom',
    preamp: clampEqualizerGain(preamp),
  }
}
