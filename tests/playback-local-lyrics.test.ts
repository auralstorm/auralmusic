import assert from 'node:assert/strict'
import test from 'node:test'

import { createPlaybackQueueSnapshot } from '../src/shared/playback.ts'

test('createPlaybackQueueSnapshot preserves local lyric payload on playback tracks', () => {
  const snapshot = createPlaybackQueueSnapshot(
    [
      {
        id: -10,
        name: 'Local Track',
        artistNames: 'Local Artist',
        albumName: 'Downloads',
        coverUrl: 'cover-local',
        duration: 0,
        sourceUrl:
          'auralmusic-media://local-file?path=F%3A%5Cdownloads%5Clocal-track.mp3',
        lyricText: '[00:01.00]Local lyric',
        translatedLyricText: '[00:01.00]本地歌词',
      },
    ],
    0
  )

  assert.equal(snapshot.currentTrack?.lyricText, '[00:01.00]Local lyric')
  assert.equal(snapshot.currentTrack?.translatedLyricText, '[00:01.00]本地歌词')
})
