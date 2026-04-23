import assert from 'node:assert/strict'
import test from 'node:test'

import {
  advancePlaybackAfterTrackEnd,
  canStartPlaybackSourceLoad,
  shouldApplyRuntimePlaybackProgress,
  shouldSyncPlaybackProgressFrame,
  isPlaybackRequestStale,
  prepareAudioForPendingTrack,
  shouldResumePlaybackTransport,
} from '../src/renderer/components/PlaybackControl/model/playback-engine.model.ts'

test('prepareAudioForPendingTrack stops current audio before resolving the next source', () => {
  const calls: string[] = []
  const audio = {
    src: 'https://cdn.example.com/current.flac',
    currentTime: 42,
    pause: () => {
      calls.push('pause')
    },
    removeAttribute: (name: string) => {
      calls.push(`remove:${name}`)
      if (name === 'src') {
        audio.src = ''
      }
    },
    load: () => {
      calls.push('load')
    },
  }

  prepareAudioForPendingTrack(audio)

  assert.deepEqual(calls, ['pause', 'remove:src', 'load'])
  assert.equal(audio.src, '')
  assert.equal(audio.currentTime, 0)
})

test('isPlaybackRequestStale only accepts the latest request and track snapshot', () => {
  assert.equal(
    isPlaybackRequestStale(1, 100, false, {
      requestId: 1,
      currentTrackId: 100,
    }),
    false
  )
  assert.equal(
    isPlaybackRequestStale(1, 100, true, {
      requestId: 1,
      currentTrackId: 100,
    }),
    true
  )
  assert.equal(
    isPlaybackRequestStale(1, 100, false, {
      requestId: 2,
      currentTrackId: 100,
    }),
    true
  )
  assert.equal(
    isPlaybackRequestStale(1, 100, false, {
      requestId: 1,
      currentTrackId: 101,
    }),
    true
  )
})

test('advancePlaybackAfterTrackEnd advances queue with automatic reason', () => {
  const calls: string[] = []

  advancePlaybackAfterTrackEnd({
    playNext: reason => {
      calls.push(`playNext:${reason}`)
      return true
    },
  })

  assert.deepEqual(calls, ['playNext:auto'])
})

test('canStartPlaybackSourceLoad waits until renderer config has loaded', () => {
  assert.equal(
    canStartPlaybackSourceLoad({
      hasCurrentTrack: true,
      requestId: 1,
      configLoading: true,
    }),
    false
  )

  assert.equal(
    canStartPlaybackSourceLoad({
      hasCurrentTrack: true,
      requestId: 1,
      configLoading: false,
    }),
    true
  )
})

test('shouldSyncPlaybackProgressFrame throttles progress updates to 30fps', () => {
  assert.equal(
    shouldSyncPlaybackProgressFrame({
      lastSyncTimestamp: 0,
      frameTimestamp: 10,
    }),
    true
  )

  assert.equal(
    shouldSyncPlaybackProgressFrame({
      lastSyncTimestamp: 10,
      frameTimestamp: 40,
    }),
    false
  )

  assert.equal(
    shouldSyncPlaybackProgressFrame({
      lastSyncTimestamp: 10,
      frameTimestamp: 43.5,
    }),
    true
  )
})

test('shouldApplyRuntimePlaybackProgress ignores stale runtime progress while a new track is loading', () => {
  assert.equal(
    shouldApplyRuntimePlaybackProgress({
      status: 'loading',
      audioPaused: false,
      audioEnded: false,
    }),
    false
  )

  assert.equal(
    shouldApplyRuntimePlaybackProgress({
      status: 'paused',
      audioPaused: true,
      audioEnded: false,
    }),
    true
  )

  assert.equal(
    shouldApplyRuntimePlaybackProgress({
      status: 'playing',
      audioPaused: false,
      audioEnded: true,
    }),
    false
  )
})

test('shouldResumePlaybackTransport resumes when a faded pause is still pending', () => {
  assert.equal(
    shouldResumePlaybackTransport({
      status: 'playing',
      hasSource: true,
      audioPaused: false,
      hasPendingPauseIntent: true,
    }),
    true
  )

  assert.equal(
    shouldResumePlaybackTransport({
      status: 'playing',
      hasSource: true,
      audioPaused: false,
      hasPendingPauseIntent: false,
    }),
    false
  )
})
