import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applySongLikeState,
  applySongLikePendingState,
} from '../src/shared/song-like-state.ts'

test('applySongLikeState adds and removes liked song ids immutably', () => {
  const initialIds = new Set([1, 2])

  const likedIds = applySongLikeState(initialIds, 3, true)
  assert.deepEqual([...likedIds], [1, 2, 3])
  assert.deepEqual([...initialIds], [1, 2])

  const unlikedIds = applySongLikeState(likedIds, 2, false)
  assert.deepEqual([...unlikedIds], [1, 3])
  assert.deepEqual([...likedIds], [1, 2, 3])
})

test('applySongLikePendingState adds and removes pending song ids immutably', () => {
  const initialIds = new Set([11])

  const pendingIds = applySongLikePendingState(initialIds, 12, true)
  assert.deepEqual([...pendingIds], [11, 12])
  assert.deepEqual([...initialIds], [11])

  const idleIds = applySongLikePendingState(pendingIds, 11, false)
  assert.deepEqual([...idleIds], [12])
  assert.deepEqual([...pendingIds], [11, 12])
})
