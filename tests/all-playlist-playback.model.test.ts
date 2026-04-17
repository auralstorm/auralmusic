import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildPlaylistPlaybackTracksRequest,
  normalizePlaylistPlaybackQueue,
} from '../src/renderer/pages/PlayList/components/AllPlayList/playlist-playback.model.ts'

test('buildPlaylistPlaybackTracksRequest requests the first 1000 playlist tracks with a cache bust timestamp', () => {
  const request = buildPlaylistPlaybackTracksRequest(9527, 123456)

  assert.deepEqual(request, {
    id: 9527,
    limit: 1000,
    offset: 0,
    timestamp: 123456,
  })
})

test('normalizePlaylistPlaybackQueue maps playlist track payload to playback queue items', () => {
  assert.deepEqual(
    normalizePlaylistPlaybackQueue({
      songs: [
        {
          id: 1,
          name: 'Track A',
          dt: 180000,
          al: { name: 'Album A', picUrl: 'cover-a' },
          ar: [{ name: 'Artist A' }, { name: 'Artist B' }],
        },
      ],
    }),
    [
      {
        id: 1,
        name: 'Track A',
        artistNames: 'Artist A / Artist B',
        albumName: 'Album A',
        coverUrl: 'cover-a',
        duration: 180000,
      },
    ]
  )
})

test('normalizePlaylistPlaybackQueue falls back for missing playlist track fields and returns empty queue for empty payload', () => {
  assert.deepEqual(
    normalizePlaylistPlaybackQueue({
      songs: [{ id: 2 }],
    }),
    [
      {
        id: 2,
        name: '未知歌曲',
        artistNames: '未知歌手',
        albumName: '未知专辑',
        coverUrl: '',
        duration: 0,
      },
    ]
  )

  assert.deepEqual(normalizePlaylistPlaybackQueue({ songs: [] }), [])
  assert.deepEqual(normalizePlaylistPlaybackQueue(null), [])
})
