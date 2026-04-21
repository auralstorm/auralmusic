import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createEqualizerGraph,
  equalizerDbToLinearGain,
} from '../src/renderer/audio/equalizer/equalizer-graph.ts'
import { DEFAULT_EQUALIZER_CONFIG } from '../src/shared/equalizer.ts'

class FakeAudioParam {
  value = 0
}

class FakeAudioNode {
  readonly connections: unknown[] = []
  disconnectCount = 0

  connect(node: unknown) {
    this.connections.push(node)
    return node
  }

  disconnect() {
    this.disconnectCount += 1
  }
}

class FakeGainNode extends FakeAudioNode {
  readonly gain = new FakeAudioParam()
}

class FakeBiquadFilterNode extends FakeAudioNode {
  type = ''
  readonly frequency = new FakeAudioParam()
  readonly Q = new FakeAudioParam()
  readonly gain = new FakeAudioParam()
}

class FakeAudioContext {
  readonly destination = new FakeAudioNode()
  readonly source = new FakeAudioNode()
  readonly gains: FakeGainNode[] = []
  readonly filters: FakeBiquadFilterNode[] = []
  closeCount = 0
  resumeCount = 0
  sinkId = ''
  setSinkIdCalls: string[] = []
  state = 'running'

  createMediaElementSource() {
    return this.source
  }

  createGain() {
    const gain = new FakeGainNode()
    this.gains.push(gain)
    return gain
  }

  createBiquadFilter() {
    const filter = new FakeBiquadFilterNode()
    this.filters.push(filter)
    return filter
  }

  async close() {
    this.closeCount += 1
  }

  async resume() {
    this.resumeCount += 1
  }

  async setSinkId(deviceId: string) {
    this.sinkId = deviceId
    this.setSinkIdCalls.push(deviceId)
  }
}

test('createEqualizerGraph builds a media element equalizer chain', () => {
  const context = new FakeAudioContext()
  const graph = createEqualizerGraph({
    audioElement: {},
    createAudioContext: () => context,
  })

  assert.equal(context.source.connections[0], context.gains[0])
  assert.equal(context.gains[0]?.connections[0], context.gains[1])
  assert.equal(context.gains[1]?.connections[0], context.filters[0])
  assert.equal(context.filters.length, 10)
  assert.equal(context.filters.at(-1)?.connections[0], context.destination)

  graph.dispose()
  assert.equal(context.closeCount, 1)
})

test('equalizer graph applies enabled and disabled config values', () => {
  const context = new FakeAudioContext()
  const graph = createEqualizerGraph({
    audioElement: {},
    createAudioContext: () => context,
  })

  graph.update({
    enabled: true,
    presetId: 'custom',
    preamp: -6,
    bands: DEFAULT_EQUALIZER_CONFIG.bands.map((band, index) => ({
      ...band,
      gain: index === 0 ? 5 : 0,
    })),
  })

  assert.equal(context.gains[1]?.gain.value, equalizerDbToLinearGain(-6))
  assert.equal(context.filters[0]?.gain.value, 5)
  assert.equal(context.filters[0]?.type, 'peaking')
  assert.equal(context.filters[0]?.frequency.value, 31)

  graph.update({ ...DEFAULT_EQUALIZER_CONFIG, enabled: false })

  assert.equal(context.gains[1]?.gain.value, 1)
  assert.deepEqual(
    context.filters.map(filter => filter.gain.value),
    DEFAULT_EQUALIZER_CONFIG.bands.map(() => 0)
  )
})

test('equalizer graph routes audio output device through audio context', async () => {
  const context = new FakeAudioContext()
  const graph = createEqualizerGraph({
    audioElement: {},
    createAudioContext: () => context,
  })

  await graph.setOutputDevice('speaker-2')

  assert.deepEqual(context.setSinkIdCalls, ['speaker-2'])
})

test('equalizer graph keeps the default audio output device id intact', async () => {
  const context = new FakeAudioContext()
  const graph = createEqualizerGraph({
    audioElement: {},
    createAudioContext: () => context,
  })

  await graph.setOutputDevice('default')

  assert.deepEqual(context.setSinkIdCalls, ['default'])
})
