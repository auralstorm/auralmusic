import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildLocalLibraryPlaybackQueue,
  buildLocalLibraryPlaybackTrack,
  createLocalLibraryAlbumQueueSourceKey,
  createLocalLibraryArtistQueueSourceKey,
  createLocalLibraryQueueSourceKey,
  resolveLocalLibraryQueueSourceDescriptor,
} from '../src/renderer/pages/LocalLibrary/local-library-playback.model.ts'
import type { LocalLibraryTrackRecord } from '../src/shared/local-library.ts'

test('buildLocalLibraryPlaybackTrack maps a scanned file into local playback data', () => {
  const track = buildLocalLibraryPlaybackTrack({
    id: 17,
    title: 'Blue Motel',
    artistName: '夏未來信',
    albumName: 'Blue Motel',
    durationMs: 245000,
    lyricText: '[00:01.00]Blue Motel',
    translatedLyricText: '[00:01.00]蓝色汽车旅馆',
    coverUrl: '',
    filePath: 'D:\\Music\\Blue Motel\\01-Blue Motel.flac',
  })

  assert.equal(track.id < 0, true)
  assert.equal(track.name, 'Blue Motel')
  assert.equal(track.artistNames, '夏未來信')
  assert.equal(track.albumName, 'Blue Motel')
  assert.equal(track.duration, 245000)
  assert.equal(track.lyricText, '[00:01.00]Blue Motel')
  assert.equal(track.translatedLyricText, '[00:01.00]蓝色汽车旅馆')
  assert.match(track.sourceUrl ?? '', /^auralmusic-media:\/\/local-file\?path=/)
})

test('local library queue source keys stay stable across tabs', () => {
  assert.equal(createLocalLibraryQueueSourceKey(), 'local-library:all')
  assert.equal(
    createLocalLibraryAlbumQueueSourceKey('Blue Motel', '夏未來信'),
    'local-library:album:Blue%20Motel:%E5%A4%8F%E6%9C%AA%E4%BE%86%E4%BF%A1'
  )
  assert.equal(
    createLocalLibraryArtistQueueSourceKey('夏未來信'),
    'local-library:artist:%E5%A4%8F%E6%9C%AA%E4%BE%86%E4%BF%A1'
  )
})

test('local library queue descriptor can rebuild scoped playback queues after library mutations', () => {
  const tracks = [
    {
      id: 1,
      rootId: 1,
      filePath: 'F:/music/Blue Motel/01.flac',
      fileName: '01.flac',
      title: 'Blue Motel',
      artistName: '夏未來信',
      albumName: 'Blue Motel',
      durationMs: 245000,
      lyricText: '',
      translatedLyricText: '',
      coverPath: null,
      coverUrl: '',
      fileSize: 1,
      mtimeMs: 1,
      audioFormat: 'flac',
      trackNo: 1,
      discNo: 1,
    },
    {
      id: 2,
      rootId: 1,
      filePath: 'F:/music/Blue Motel/02.flac',
      fileName: '02.flac',
      title: 'Wind',
      artistName: '夏未來信',
      albumName: 'Blue Motel',
      durationMs: 240000,
      lyricText: '',
      translatedLyricText: '',
      coverPath: null,
      coverUrl: '',
      fileSize: 1,
      mtimeMs: 1,
      audioFormat: 'flac',
      trackNo: 2,
      discNo: 1,
    },
  ] satisfies LocalLibraryTrackRecord[]

  const sourceKey = createLocalLibraryAlbumQueueSourceKey(
    'Blue Motel',
    '夏未來信'
  )
  assert.deepEqual(resolveLocalLibraryQueueSourceDescriptor(sourceKey), {
    type: 'album',
    albumName: 'Blue Motel',
    artistName: '夏未來信',
  })
  assert.equal(buildLocalLibraryPlaybackQueue(tracks, sourceKey).length, 2)
})
