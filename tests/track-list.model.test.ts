import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getTrackListFooterText,
  shouldTriggerTrackListEndReached,
} from '../src/renderer/components/TrackList/model/track-list-virtualization.model.ts'

test('getTrackListFooterText returns loading text while more items are loading', () => {
  assert.equal(
    getTrackListFooterText({
      itemCount: 12,
      loading: true,
      hasMore: true,
      loadingText: '正在加载更多...',
      endText: '没有更多了',
    }),
    '正在加载更多...'
  )
})

test('getTrackListFooterText returns end text when list is exhausted', () => {
  assert.equal(
    getTrackListFooterText({
      itemCount: 12,
      loading: false,
      hasMore: false,
      loadingText: '正在加载更多...',
      endText: '没有更多了',
    }),
    '没有更多了'
  )
})

test('shouldTriggerTrackListEndReached blocks duplicate end-reached calls', () => {
  assert.equal(
    shouldTriggerTrackListEndReached({
      itemCount: 30,
      loading: true,
      hasMore: true,
    }),
    false
  )

  assert.equal(
    shouldTriggerTrackListEndReached({
      itemCount: 30,
      loading: false,
      hasMore: false,
    }),
    false
  )

  assert.equal(
    shouldTriggerTrackListEndReached({
      itemCount: 30,
      loading: false,
      hasMore: true,
    }),
    true
  )
})
