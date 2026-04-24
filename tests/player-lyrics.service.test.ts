import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isLocalPlaybackTrack,
  resolveLocalPlaybackLyricTextBundle,
} from '../src/renderer/components/PlayerScene/player-lyrics-source.model.ts'

test('resolveLocalPlaybackLyricTextBundle prefers local playback lyrics and skips remote fetching', () => {
  assert.deepEqual(
    resolveLocalPlaybackLyricTextBundle({
      id: -7,
      name: 'Local Track',
      artistNames: 'Local Artist',
      albumName: 'Local Album',
      coverUrl: '',
      duration: 123000,
      sourceUrl:
        'auralmusic-media://local-file?path=F%3A%5Cdownloads%5Clocal-track.mp3',
      lyricText: '[00:01.00]Local lyric',
      translatedLyricText: '[00:01.00]本地歌词',
    }),
    {
      lrc: '[00:01.00]Local lyric',
      tlyric: '[00:01.00]本地歌词',
      yrc: '',
    }
  )
})

test('resolveLocalPlaybackLyricTextBundle returns an empty bundle for local tracks without embedded lyrics', () => {
  assert.equal(
    resolveLocalPlaybackLyricTextBundle({
      id: -8,
      name: 'Local Track',
      artistNames: 'Local Artist',
      albumName: 'Local Album',
      coverUrl: '',
      duration: 123000,
      sourceUrl:
        'auralmusic-media://local-file?path=F%3A%5Cdownloads%5Clocal-track.mp3',
      lyricText: '',
      translatedLyricText: '',
    }),
    null
  )
})

test('resolveLocalPlaybackLyricTextBundle ignores remote playback tracks', () => {
  assert.equal(
    resolveLocalPlaybackLyricTextBundle({
      id: 17,
      name: 'Online Track',
      artistNames: 'Online Artist',
      albumName: 'Cloud Album',
      coverUrl: '',
      duration: 123000,
      sourceUrl: 'https://example.com/audio.mp3',
    }),
    null
  )
})

test('isLocalPlaybackTrack only matches local media protocol tracks', () => {
  assert.equal(
    isLocalPlaybackTrack({
      id: -9,
      name: 'Local Track',
      artistNames: 'Local Artist',
      albumName: 'Local Album',
      coverUrl: '',
      duration: 123000,
      sourceUrl:
        'auralmusic-media://local-file?path=F%3A%5Cdownloads%5Clocal-track.mp3',
    }),
    true
  )

  assert.equal(
    isLocalPlaybackTrack({
      id: 19,
      name: 'Remote Track',
      artistNames: 'Remote Artist',
      albumName: 'Remote Album',
      coverUrl: '',
      duration: 123000,
      sourceUrl: 'https://example.com/audio.mp3',
    }),
    false
  )
})
