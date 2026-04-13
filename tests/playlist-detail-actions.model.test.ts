import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildPlaylistUpdatePayload,
  PLAYLIST_NAME_MAX_LENGTH,
  resolvePlaylistDetailMoreActions,
} from '../src/renderer/pages/PlayList/Detail/playlist-detail-actions.model.ts'

test('resolvePlaylistDetailMoreActions exposes edit and delete only for owned playlists', () => {
  assert.deepEqual(resolvePlaylistDetailMoreActions(true), ['edit', 'delete'])
  assert.deepEqual(resolvePlaylistDetailMoreActions(false), [])
})

test('buildPlaylistUpdatePayload trims fields and preserves empty description', () => {
  assert.deepEqual(
    buildPlaylistUpdatePayload({
      id: 101,
      name: '  夜骑歌单  ',
      description: '  通勤时听  ',
    }),
    {
      id: 101,
      name: '夜骑歌单',
      desc: '通勤时听',
    }
  )

  assert.deepEqual(
    buildPlaylistUpdatePayload({
      id: 101,
      name: '夜骑歌单',
      description: '   ',
    }),
    {
      id: 101,
      name: '夜骑歌单',
      desc: '',
    }
  )
})

test('buildPlaylistUpdatePayload rejects blank or overlong playlist names', () => {
  assert.equal(
    buildPlaylistUpdatePayload({
      id: 101,
      name: '   ',
      description: '',
    }),
    null
  )

  assert.equal(
    buildPlaylistUpdatePayload({
      id: 101,
      name: 'a'.repeat(PLAYLIST_NAME_MAX_LENGTH + 1),
      description: '',
    }),
    null
  )
})
