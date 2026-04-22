import test from 'node:test'
import assert from 'node:assert/strict'

import { buildPlaylistDetailLoadRequest } from '../src/renderer/pages/PlayList/Detail/playlist-detail-refresh.model.ts'

test('buildPlaylistDetailLoadRequest adds timestamp when busting cache', () => {
  const request = buildPlaylistDetailLoadRequest(9527, true, 123456789)

  assert.deepEqual(request, {
    detail: {
      id: 9527,
      timestamp: 123456789,
    },
    tracks: {
      id: 9527,
      limit: 30,
      offset: 0,
      timestamp: 123456789,
    },
  })
})

test('buildPlaylistDetailLoadRequest omits timestamp for normal loads', () => {
  const request = buildPlaylistDetailLoadRequest(9527, false, 123456789)

  assert.deepEqual(request, {
    detail: {
      id: 9527,
      timestamp: undefined,
    },
    tracks: {
      id: 9527,
      limit: 30,
      offset: 0,
      timestamp: undefined,
    },
  })
})
