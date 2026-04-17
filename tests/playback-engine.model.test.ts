import assert from 'node:assert/strict'
import test from 'node:test'

import { prepareAudioForPendingTrack } from '../src/renderer/components/PlaybackControl/playback-engine.model.ts'

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
