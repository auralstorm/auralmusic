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

  await runtime.loadSource(
    'auralmusic-media://local-file?path=F%3A%5CMusic%5Cone.mp3'
  )
  runtime.applyEqualizer({ ...DEFAULT_EQUALIZER_CONFIG, enabled: true })
  runtime.applyEqualizer({ ...DEFAULT_EQUALIZER_CONFIG, enabled: true })

  assert.equal(createCount, 1)
})

test('playback runtime keeps requiring graph-compatible sources after graph creation', async () => {
  const audio = new FakeAudio()

  const runtime = createPlaybackRuntime({
    createAudioElement: () => audio as unknown as HTMLAudioElement,
    createEqualizerGraph: () => ({
      update() {},
      async resume() {},
      async setOutputDevice() {
        return true
      },
      dispose() {},
    }),
  })

  assert.equal(runtime.requiresEqualizerCompatibleSource(), false)

  await runtime.loadSource(
    'auralmusic-media://local-file?path=F%3A%5CMusic%5Cone.mp3'
  )
  runtime.applyEqualizer({ ...DEFAULT_EQUALIZER_CONFIG, enabled: true })
  runtime.applyEqualizer({ ...DEFAULT_EQUALIZER_CONFIG, enabled: false })

  assert.equal(runtime.requiresEqualizerCompatibleSource(), true)
})

test('playback runtime does not create equalizer graph for remote http audio sources', async () => {
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

  await runtime.loadSource('https://cdn.example.com/one.mp3')
  runtime.applyEqualizer({ ...DEFAULT_EQUALIZER_CONFIG, enabled: true })
  await runtime.play()

  assert.equal(createCount, 0)
  assert.equal(audio.playCount, 1)
})

test('playback runtime resumes equalizer graph when EQ is enabled during active playback', async () => {
  const audio = new FakeAudio()
  let resumeCount = 0

  const runtime = createPlaybackRuntime({
    createAudioElement: () => audio as unknown as HTMLAudioElement,
    createEqualizerGraph: () => ({
      update() {},
      async resume() {
        resumeCount += 1
      },
      async setOutputDevice() {
        return true
      },
      dispose() {},
    }),
  })

  await runtime.loadSource(
    'auralmusic-media://local-file?path=F%3A%5CMusic%5Cone.mp3'
  )
  await runtime.play()
  runtime.applyEqualizer({ ...DEFAULT_EQUALIZER_CONFIG, enabled: true })

  assert.equal(resumeCount, 1)
})

test('playback runtime keeps an existing equalizer graph running when EQ is disabled during active playback', async () => {
  const audio = new FakeAudio()
  let resumeCount = 0

  const runtime = createPlaybackRuntime({
    createAudioElement: () => audio as unknown as HTMLAudioElement,
    createEqualizerGraph: () => ({
      update() {},
      async resume() {
        resumeCount += 1
      },
      async setOutputDevice() {
        return true
      },
      dispose() {},
    }),
  })

  await runtime.loadSource(
    'auralmusic-media://local-file?path=F%3A%5CMusic%5Cone.mp3'
  )
  await runtime.play()
  runtime.applyEqualizer({ ...DEFAULT_EQUALIZER_CONFIG, enabled: true })
  runtime.applyEqualizer({ ...DEFAULT_EQUALIZER_CONFIG, enabled: false })

  assert.equal(resumeCount, 2)
})

test('playback runtime resumes an existing equalizer graph before playing while EQ is disabled', async () => {
  const audio = new FakeAudio()
  let resumeCount = 0

  const runtime = createPlaybackRuntime({
    createAudioElement: () => audio as unknown as HTMLAudioElement,
    createEqualizerGraph: () => ({
      update() {},
      async resume() {
        resumeCount += 1
      },
      async setOutputDevice() {
        return true
      },
      dispose() {},
    }),
  })

  await runtime.loadSource(
    'auralmusic-media://local-file?path=F%3A%5CMusic%5Cone.mp3'
  )
  runtime.applyEqualizer({ ...DEFAULT_EQUALIZER_CONFIG, enabled: true })
  runtime.applyEqualizer({ ...DEFAULT_EQUALIZER_CONFIG, enabled: false })
  await runtime.play()

  assert.equal(resumeCount, 1)
  assert.equal(audio.playCount, 1)
})

test('playback runtime falls back to the audio element when graph output switching fails', async () => {
  const audio = new FakeAudio() as HTMLAudioElement & {
    setSinkId?: (deviceId: string) => Promise<void>
  }
  const sinkIds: string[] = []
  audio.setSinkId = async deviceId => {
    sinkIds.push(deviceId)
  }

  const runtime = createPlaybackRuntime({
    createAudioElement: () => audio,
    createEqualizerGraph: () => ({
      update() {},
      async resume() {},
      async setOutputDevice() {
        throw new Error('graph sink failed')
      },
      dispose() {},
    }),
  })

  runtime.applyEqualizer({ ...DEFAULT_EQUALIZER_CONFIG, enabled: true })
  const success = await runtime.setOutputDevice('speaker-2')

  assert.equal(success, true)
  assert.deepEqual(sinkIds, ['speaker-2'])
})

test('default device id stays stable during runtime output switching', async () => {
  const audio = new FakeAudio() as HTMLAudioElement & {
    setSinkId?: (deviceId: string) => Promise<void>
  }
  const sinkIds: string[] = []
  audio.setSinkId = async deviceId => {
    sinkIds.push(deviceId)
  }

  const runtime = createPlaybackRuntime({
    createAudioElement: () => audio,
  })

  await runtime.setOutputDevice('default')

  assert.deepEqual(sinkIds, ['default'])
})
