import assert from 'node:assert/strict'
import test from 'node:test'

import { createPlaybackRuntime } from '../src/renderer/audio/playback-runtime/playback-runtime.ts'
import { DEFAULT_EQUALIZER_CONFIG } from '../src/shared/equalizer.ts'

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

test('playback runtime reuses a single audio element and swaps only src', async () => {
  const audio = new FakeAudio()
  const runtime = createPlaybackRuntime({
    createAudioElement: () => audio as unknown as HTMLAudioElement,
  })

  await runtime.loadSource('https://a.test/one.mp3')
  await runtime.loadSource('https://a.test/two.mp3')

  assert.equal(runtime.getAudioElement(), audio)
  assert.equal(audio.src, 'https://a.test/two.mp3')
  assert.equal(audio.pauseCount >= 1, true)
})

test('output device failure does not clear the active source', async () => {
  const audio = new FakeAudio() as HTMLAudioElement & {
    setSinkId?: (deviceId: string) => Promise<void>
  }
  audio.setSinkId = async () => {
    throw new Error('sink failed')
  }

  const runtime = createPlaybackRuntime({
    createAudioElement: () => audio,
  })

  await runtime.loadSource('https://a.test/one.mp3')
  const success = await runtime.setOutputDevice('speaker-2')

  assert.equal(success, false)
  assert.equal(audio.src, 'https://a.test/one.mp3')
})

test('playback runtime stops old audio before switching tracks', async () => {
  const audio = new FakeAudio()
  const runtime = createPlaybackRuntime({
    createAudioElement: () => audio as unknown as HTMLAudioElement,
  })

  await runtime.loadSource('https://a.test/one.mp3')
  await runtime.play()
  await runtime.loadSource('https://a.test/two.mp3')

  assert.equal(audio.pauseCount >= 2, true)
  assert.equal(audio.src, 'https://a.test/two.mp3')
})

test('playback runtime creates equalizer graph once and reuses it', async () => {
  const audio = new FakeAudio()
  let createCount = 0

  const runtime = createPlaybackRuntime({
    createAudioElement: () => audio as unknown as HTMLAudioElement,
    createEqualizerGraph: () => {
      createCount += 1
      return {
        update() {},
        async resume() {},
        async setOutputDevice() {
          return true
        },
        dispose() {},
      }
    },
  })

  runtime.applyEqualizer({ ...DEFAULT_EQUALIZER_CONFIG, enabled: true })
  runtime.applyEqualizer({ ...DEFAULT_EQUALIZER_CONFIG, enabled: true })

  assert.equal(createCount, 1)
})
