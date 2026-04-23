import assert from 'node:assert/strict'
import test from 'node:test'

import { createEqualizerGraph } from '../src/renderer/audio/equalizer/equalizer-graph.ts'
import { createPlaybackRuntime } from '../src/renderer/audio/playback-runtime/playback-runtime.ts'

class FakeAudioParam {
  value = 0
  readonly setCalls: Array<{ value: number; time: number }> = []
  readonly rampCalls: Array<{ value: number; time: number }> = []
  readonly cancelCalls: number[] = []
  readonly holdCalls: number[] = []

  setValueAtTime(value: number, time: number) {
    this.value = value
    this.setCalls.push({ value, time })
  }

  linearRampToValueAtTime(value: number, time: number) {
    this.value = value
    this.rampCalls.push({ value, time })
  }

  cancelScheduledValues(time: number) {
    this.cancelCalls.push(time)
  }

  cancelAndHoldAtTime(time: number) {
    this.holdCalls.push(time)
  }
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
  currentTime = 10
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

  async close() {}

  async resume() {}
}

test('equalizer graph exposes master gain based fade controls', () => {
  const context = new FakeAudioContext()
  const graph = createEqualizerGraph({
    audioElement: {} as HTMLMediaElement,
    createAudioContext: () => context,
  })

  assert.equal(typeof graph.fadeTo, 'function')
  assert.equal(typeof graph.setMasterVolume, 'function')
  assert.equal(typeof graph.getMasterVolume, 'function')

  graph.setMasterVolume(0.5)
  graph.fadeTo(1, 180)

  const masterGain = context.gains[0]

  assert.equal(masterGain?.gain.value, 1)
  assert.deepEqual(masterGain?.gain.holdCalls, [10])
  assert.deepEqual(masterGain?.gain.cancelCalls, [])
  assert.deepEqual(masterGain?.gain.setCalls, [])
  assert.deepEqual(masterGain?.gain.rampCalls.at(-1), {
    value: 1,
    time: 10.18,
  })
})

test('equalizer graph holds the interpolated gain value before starting a new fade', () => {
  const context = new FakeAudioContext()
  const graph = createEqualizerGraph({
    audioElement: {} as HTMLMediaElement,
    createAudioContext: () => context,
  })

  graph.setMasterVolume(0)
  graph.fadeTo(1, 500)
  graph.fadeTo(0, 500)

  const masterGain = context.gains[0]

  assert.deepEqual(masterGain?.gain.holdCalls, [10, 10])
  assert.equal(masterGain?.gain.setCalls.length, 0)
  assert.deepEqual(masterGain?.gain.rampCalls, [
    { value: 1, time: 10.5 },
    { value: 0, time: 10.5 },
  ])
})

class FakeAudio extends EventTarget {
  src = ''
  paused = true
  volume = 1
  currentTime = 0
  playbackRate = 1
  loadCount = 0
  playCount = 0
  pauseCount = 0

  load() {
    this.loadCount += 1
  }

  async play() {
    this.playCount += 1
    this.paused = false
  }

  pause() {
    this.pauseCount += 1
    this.paused = true
  }

  removeAttribute(name: string) {
    if (name === 'src') {
      this.src = ''
    }
  }
}

test('playback runtime fades in before audible playback when enabled', async () => {
  const audio = new FakeAudio()
  const fadeCalls: Array<{ volume: number; durationMs: number }> = []

  const runtime = createPlaybackRuntime({
    createAudioElement: () => audio as unknown as HTMLAudioElement,
    createEqualizerGraph: () => ({
      update() {},
      async resume() {},
      setMasterVolume() {},
      getMasterVolume() {
        return 1
      },
      fadeTo(volume, durationMs) {
        fadeCalls.push({ volume, durationMs })
      },
      async setOutputDevice() {
        return true
      },
      dispose() {},
    }),
  })

  runtime.setFadeEnabled(true)
  await runtime.loadSource(
    'auralmusic-media://local-file?path=F%3A%5CMusic%5Cone.mp3'
  )
  await runtime.playWithFade()

  assert.deepEqual(fadeCalls, [{ volume: 1, durationMs: 500 }])
  assert.equal(audio.playCount, 1)
})

test('playback runtime fades out before pause when enabled', async () => {
  const audio = new FakeAudio()
  const fadeCalls: Array<{ volume: number; durationMs: number }> = []
  const masterVolumeCalls: number[] = []

  const runtime = createPlaybackRuntime({
    createAudioElement: () => audio as unknown as HTMLAudioElement,
    createEqualizerGraph: () => ({
      update() {},
      async resume() {},
      setMasterVolume(volume) {
        masterVolumeCalls.push(volume)
      },
      getMasterVolume() {
        return 1
      },
      fadeTo(volume, durationMs) {
        fadeCalls.push({ volume, durationMs })
      },
      async setOutputDevice() {
        return true
      },
      dispose() {},
    }),
  })

  runtime.setFadeEnabled(true)
  await runtime.loadSource(
    'auralmusic-media://local-file?path=F%3A%5CMusic%5Cone.mp3'
  )
  await runtime.play()
  masterVolumeCalls.length = 0
  await runtime.pauseWithFade()

  assert.deepEqual(fadeCalls[0], { volume: 0, durationMs: 500 })
  assert.equal(audio.pauseCount >= 2, true)
  assert.deepEqual(masterVolumeCalls, [])
})

test('playback runtime restores master volume before hard resume after faded pause', async () => {
  const audio = new FakeAudio()
  const masterVolumeCalls: number[] = []

  const runtime = createPlaybackRuntime({
    createAudioElement: () => audio as unknown as HTMLAudioElement,
    createEqualizerGraph: () => ({
      update() {},
      async resume() {},
      setMasterVolume(volume) {
        masterVolumeCalls.push(volume)
      },
      getMasterVolume() {
        return 0
      },
      fadeTo() {},
      async setOutputDevice() {
        return true
      },
      dispose() {},
    }),
  })

  runtime.setFadeEnabled(true)
  await runtime.loadSource(
    'auralmusic-media://local-file?path=F%3A%5CMusic%5Cone.mp3'
  )
  await runtime.pauseWithFade()
  runtime.setFadeEnabled(false)
  await runtime.play()

  assert.deepEqual(masterVolumeCalls, [1])
})

test('playback runtime swaps sources with fade when enabled', async () => {
  const audio = new FakeAudio()
  const fadeCalls: Array<{ volume: number; durationMs: number }> = []

  const runtime = createPlaybackRuntime({
    createAudioElement: () => audio as unknown as HTMLAudioElement,
    createEqualizerGraph: () => ({
      update() {},
      async resume() {},
      setMasterVolume() {},
      getMasterVolume() {
        return 1
      },
      fadeTo(volume, durationMs) {
        fadeCalls.push({ volume, durationMs })
      },
      async setOutputDevice() {
        return true
      },
      dispose() {},
    }),
  })

  runtime.setFadeEnabled(true)
  await runtime.loadSource(
    'auralmusic-media://local-file?path=F%3A%5CMusic%5Cone.mp3'
  )
  await runtime.play()
  await runtime.swapSourceWithFade(
    'auralmusic-media://local-file?path=F%3A%5CMusic%5Ctwo.mp3'
  )

  assert.deepEqual(fadeCalls, [
    { volume: 0, durationMs: 500 },
    { volume: 1, durationMs: 500 },
  ])
  assert.equal(
    audio.src,
    'auralmusic-media://local-file?path=F%3A%5CMusic%5Ctwo.mp3'
  )
})

test('playback runtime ignores stale faded pause when playback resumes before fade completes', async () => {
  const audio = new FakeAudio()
  const fadeCalls: Array<{ volume: number; durationMs: number }> = []

  const runtime = createPlaybackRuntime({
    createAudioElement: () => audio as unknown as HTMLAudioElement,
    createEqualizerGraph: () => ({
      update() {},
      async resume() {},
      setMasterVolume() {},
      getMasterVolume() {
        return 1
      },
      fadeTo(volume, durationMs) {
        fadeCalls.push({ volume, durationMs })
      },
      async setOutputDevice() {
        return true
      },
      dispose() {},
    }),
  })

  runtime.setFadeEnabled(true)
  await runtime.loadSource(
    'auralmusic-media://local-file?path=F%3A%5CMusic%5Cone.mp3'
  )
  await runtime.playWithFade()

  const pendingPause = runtime.pauseWithFade()
  await runtime.playWithFade()
  await pendingPause

  assert.equal(audio.paused, false)
  assert.deepEqual(fadeCalls, [
    { volume: 1, durationMs: 500 },
    { volume: 0, durationMs: 500 },
    { volume: 1, durationMs: 500 },
  ])
})
