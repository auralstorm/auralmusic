import {
  DEFAULT_EQUALIZER_CONFIG,
  EQ_BANDS,
  normalizeEqualizerConfig,
  type EqualizerConfig,
} from '../../../shared/equalizer.ts'
import { DEFAULT_AUDIO_OUTPUT_DEVICE_ID } from '../../lib/audio-output.ts'

type ConnectableAudioNode = {
  connect: (node: unknown) => unknown
  disconnect: () => void
}

type EqualizerAudioParam = {
  value: number
}

type EqualizerGainNode = ConnectableAudioNode & {
  gain: EqualizerAudioParam
}

type EqualizerBiquadFilterNode = ConnectableAudioNode & {
  type: BiquadFilterType | string
  frequency: EqualizerAudioParam
  Q: EqualizerAudioParam
  gain: EqualizerAudioParam
}

type EqualizerAudioContext = {
  destination: unknown
  state: string
  createMediaElementSource: (audioElement: unknown) => ConnectableAudioNode
  createGain: () => EqualizerGainNode
  createBiquadFilter: () => EqualizerBiquadFilterNode
  setSinkId?: (sinkId: string) => Promise<void>
  resume: () => Promise<void>
  close: () => Promise<void>
}

export interface EqualizerGraph {
  update: (config: EqualizerConfig) => void
  resume: () => Promise<void>
  setOutputDevice: (deviceId: string) => Promise<boolean>
  dispose: () => void
}

export function equalizerDbToLinearGain(db: number) {
  return Math.pow(10, db / 20)
}

function normalizeAudioContextSinkId(deviceId: string) {
  return deviceId || DEFAULT_AUDIO_OUTPUT_DEVICE_ID
}

function connectNodes(nodes: unknown[]) {
  for (let index = 0; index < nodes.length - 1; index += 1) {
    ;(nodes[index] as ConnectableAudioNode).connect(nodes[index + 1])
  }
}

function createDefaultAudioContext(): EqualizerAudioContext {
  const AudioContextConstructor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext

  if (!AudioContextConstructor) {
    throw new Error('AudioContext is not supported')
  }

  return new AudioContextConstructor()
}

export function createEqualizerGraph(options: {
  audioElement: unknown
  createAudioContext?: () => EqualizerAudioContext
}): EqualizerGraph {
  const audioContext =
    options.createAudioContext?.() ?? createDefaultAudioContext()
  const source = audioContext.createMediaElementSource(options.audioElement)
  const preamp = audioContext.createGain()
  const filters = EQ_BANDS.map(band => {
    const filter = audioContext.createBiquadFilter()
    filter.type = 'peaking'
    filter.frequency.value = band.frequency
    filter.Q.value = 1
    filter.gain.value = 0
    return filter
  })

  connectNodes([source, preamp, ...filters, audioContext.destination])

  const graph: EqualizerGraph = {
    update(config) {
      const normalizedConfig = normalizeEqualizerConfig(config)

      if (!normalizedConfig.enabled) {
        preamp.gain.value = 1
        filters.forEach(filter => {
          filter.gain.value = 0
        })
        return
      }

      preamp.gain.value = equalizerDbToLinearGain(normalizedConfig.preamp)
      normalizedConfig.bands.forEach((band, index) => {
        const filter = filters[index]
        if (filter) {
          filter.gain.value = band.gain
        }
      })
    },
    async resume() {
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }
    },
    async setOutputDevice(deviceId) {
      if (!audioContext.setSinkId) {
        return false
      }

      await audioContext.setSinkId(normalizeAudioContextSinkId(deviceId))
      return true
    },
    dispose() {
      ;[source, preamp, ...filters].forEach(node => {
        node.disconnect()
      })
      void audioContext.close()
    },
  }

  graph.update(DEFAULT_EQUALIZER_CONFIG)

  return graph
}
