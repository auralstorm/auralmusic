import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildDownloadTaskPlaybackTrack,
  toDownloadTaskFileUrl,
} from '../src/renderer/pages/Downloads/download-playback.model.ts'

test('toDownloadTaskFileUrl converts Windows file paths into file urls', () => {
  assert.equal(
    toDownloadTaskFileUrl('F:\\Music Library\\Blank Space.mp3'),
    'auralmusic-media://local-file?path=F%3A%5CMusic+Library%5CBlank+Space.mp3'
  )
})

test('buildDownloadTaskPlaybackTrack maps a completed download into a local playback track', () => {
  const track = buildDownloadTaskPlaybackTrack({
    taskId: 'download-1',
    songId: 123,
    songName: 'Blank Space',
    artistName: 'Taylor Swift',
    coverUrl: 'cover.jpg',
    albumName: '1989',
    targetPath: 'F:\\Music Library\\Blank Space.mp3',
    status: 'completed',
    progress: 100,
    quality: 'jymaster',
  })

  assert.deepEqual(track, {
    id: 123,
    name: 'Blank Space',
    artistNames: 'Taylor Swift',
    albumName: '1989',
    coverUrl: 'cover.jpg',
    duration: 0,
    sourceUrl:
      'auralmusic-media://local-file?path=F%3A%5CMusic+Library%5CBlank+Space.mp3',
  })
})
