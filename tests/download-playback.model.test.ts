import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildDownloadTaskPlaybackTrack,
  buildDownloadTaskPlaybackQueue,
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

test('buildDownloadTaskPlaybackQueue keeps only playable local tasks and returns the selected start index', () => {
  const queue = buildDownloadTaskPlaybackQueue(
    [
      {
        taskId: 'queued-task',
        songId: 1,
        songName: 'Queued Song',
        artistName: 'Artist A',
        coverUrl: '',
        albumName: 'Album A',
        targetPath: 'F:\\Music Library\\Queued Song.mp3',
        status: 'queued',
        progress: 12,
        quality: 'higher',
      },
      {
        taskId: 'completed-first',
        songId: 2,
        songName: 'First Song',
        artistName: 'Artist B',
        coverUrl: 'first.jpg',
        albumName: 'Album B',
        targetPath: 'F:\\Music Library\\First Song.mp3',
        status: 'completed',
        progress: 100,
        quality: 'lossless',
      },
      {
        taskId: 'completed-second',
        songId: 3,
        songName: 'Second Song',
        artistName: 'Artist C',
        coverUrl: 'second.jpg',
        albumName: 'Album C',
        targetPath: 'F:\\Music Library\\Second Song.mp3',
        status: 'completed',
        progress: 100,
        quality: 'lossless',
      },
      {
        taskId: 'failed-task',
        songId: 4,
        songName: 'Failed Song',
        artistName: 'Artist D',
        coverUrl: '',
        albumName: 'Album D',
        targetPath: 'F:\\Music Library\\Failed Song.mp3',
        status: 'failed',
        progress: 0,
        quality: 'standard',
      },
    ],
    'completed-second'
  )

  assert.deepEqual(queue, {
    startIndex: 1,
    tracks: [
      {
        id: 2,
        name: 'First Song',
        artistNames: 'Artist B',
        albumName: 'Album B',
        coverUrl: 'first.jpg',
        duration: 0,
        sourceUrl:
          'auralmusic-media://local-file?path=F%3A%5CMusic+Library%5CFirst+Song.mp3',
      },
      {
        id: 3,
        name: 'Second Song',
        artistNames: 'Artist C',
        albumName: 'Album C',
        coverUrl: 'second.jpg',
        duration: 0,
        sourceUrl:
          'auralmusic-media://local-file?path=F%3A%5CMusic+Library%5CSecond+Song.mp3',
      },
    ],
  })
})
