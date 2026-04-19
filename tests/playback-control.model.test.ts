import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clampPlaybackPercent,
  createPlaybackControlTrack,
  getPlaybackTransportState,
  getPlaybackModeLabel,
  getPlaybackProgressViewState,
} from '../src/renderer/components/PlaybackControl/model/playback-control.model.ts'

test('clampPlaybackPercent keeps slider values inside 0-100', () => {
  assert.equal(clampPlaybackPercent(Number.NaN), 0)
  assert.equal(clampPlaybackPercent(-10), 0)
  assert.equal(clampPlaybackPercent(35), 35)
  assert.equal(clampPlaybackPercent(120), 100)
})

test('createPlaybackControlTrack maps playback track for the footer display', () => {
  assert.deepEqual(
    createPlaybackControlTrack({
      id: 1,
      name: 'Track',
      artistNames: 'Artist',
      albumName: 'Album',
      coverUrl: 'cover',
      duration: 1000,
    }),
    {
      name: 'Track',
      artistName: 'Artist',
      coverUrl: 'cover',
    }
  )

  assert.equal(createPlaybackControlTrack(null).artistName, 'AuralMusic')
})

test('getPlaybackProgressViewState clamps drag progress to the duration', () => {
  assert.deepEqual(getPlaybackProgressViewState(0, 0, null), {
    maxProgress: 1,
    currentProgress: 0,
  })
  assert.deepEqual(getPlaybackProgressViewState(1000, 300, 1200), {
    maxProgress: 1000,
    currentProgress: 1000,
  })
})

test('getPlaybackModeLabel returns stable labels for each playback mode', () => {
  assert.equal(getPlaybackModeLabel('repeat-all'), '\u5faa\u73af\u64ad\u653e')
  assert.equal(getPlaybackModeLabel('shuffle'), '\u968f\u673a\u64ad\u653e')
  assert.equal(getPlaybackModeLabel('repeat-one'), '\u5355\u66f2\u5faa\u73af')
})

test('getPlaybackTransportState derives hasTrack and playing state from track and status', () => {
  assert.deepEqual(
    getPlaybackTransportState({
      track: null,
      status: 'idle',
    }),
    {
      hasTrack: false,
      isPlaying: false,
    }
  )

  assert.deepEqual(
    getPlaybackTransportState({
      track: {
        id: 1,
        name: 'Track',
        artistNames: 'Artist',
        albumName: 'Album',
        coverUrl: 'cover',
        duration: 1000,
      },
      status: 'loading',
    }),
    {
      hasTrack: true,
      isPlaying: true,
    }
  )
})
