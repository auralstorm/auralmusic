import assert from 'node:assert/strict'
import test from 'node:test'

import {
  advancePlaybackAfterTrackEnd,
  isPlaybackRequestStale,
  prepareAudioForPendingTrack,
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
