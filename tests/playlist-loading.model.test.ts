import test from 'node:test'
import assert from 'node:assert/strict'

import { shouldShowInitialPlaylistSkeleton } from '../src/renderer/pages/PlayList/components/AllPlayList/playlist-loading.model.ts'

test('shouldShowInitialPlaylistSkeleton only shows skeleton before playlist data exists', () => {
  assert.equal(shouldShowInitialPlaylistSkeleton(true, 0), true)
  assert.equal(shouldShowInitialPlaylistSkeleton(false, 0), false)
  assert.equal(shouldShowInitialPlaylistSkeleton(true, 50), false)
})
