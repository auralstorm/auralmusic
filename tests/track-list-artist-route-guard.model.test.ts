import assert from 'node:assert/strict'
import test from 'node:test'

import { shouldNavigateToArtistDetail } from '../src/renderer/components/TrackList/model/track-list-helpers.model.ts'

test('shouldNavigateToArtistDetail blocks navigation when already on the same artist detail route', () => {
  assert.equal(shouldNavigateToArtistDetail('/artists/123', 123), false)
  assert.equal(shouldNavigateToArtistDetail('/artists/123/', 123), false)
})

test('shouldNavigateToArtistDetail allows navigation when artist id differs', () => {
  assert.equal(shouldNavigateToArtistDetail('/artists/123', 456), true)
})

test('shouldNavigateToArtistDetail allows navigation from non-artist-detail pages', () => {
  assert.equal(shouldNavigateToArtistDetail('/artists', 123), true)
  assert.equal(shouldNavigateToArtistDetail('/daily-songs', 123), true)
})

test('shouldNavigateToArtistDetail blocks navigation for invalid target artist id', () => {
  assert.equal(shouldNavigateToArtistDetail('/artists/123', 0), false)
  assert.equal(shouldNavigateToArtistDetail('/artists/123'), false)
})

test('shouldNavigateToArtistDetail blocks same-artist navigation from artist songs route', () => {
  assert.equal(shouldNavigateToArtistDetail('/artists/123/songs', 123), false)
  assert.equal(shouldNavigateToArtistDetail('/artists/123/songs', 456), true)
})
