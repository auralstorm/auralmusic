import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildLocalLibraryAlbumQueryInput,
  buildLocalLibraryArtistQueryInput,
  buildLocalLibraryTrackQueryInput,
  createEmptyLocalLibraryPagedState,
  EMPTY_LOCAL_LIBRARY_OVERVIEW,
  EMPTY_LOCAL_LIBRARY_SONG_SCOPE,
  getLocalLibraryEmptyState,
} from '../src/renderer/pages/LocalLibrary/local-library.model.ts'

test('local library query model builds scoped track query input', () => {
  assert.deepEqual(
    buildLocalLibraryTrackQueryInput(
      '周杰伦',
      {
        type: 'album',
        key: 1,
        value: '七里香',
        artistName: '周杰伦',
      },
      40,
      80
    ),
    {
      keyword: '周杰伦',
      scopeType: 'album',
      scopeValue: '七里香',
      scopeArtistName: '周杰伦',
      offset: 40,
      limit: 80,
    }
  )
})

test('local library query model builds album and artist query inputs', () => {
  assert.deepEqual(buildLocalLibraryAlbumQueryInput('摇滚', 0, 120), {
    keyword: '摇滚',
    offset: 0,
    limit: 120,
  })

  assert.deepEqual(buildLocalLibraryArtistQueryInput('周杰伦', 120, 120), {
    keyword: '周杰伦',
    offset: 120,
    limit: 120,
  })
})

test('local library query model creates empty paged state with provided limit', () => {
  assert.deepEqual(createEmptyLocalLibraryPagedState(80), {
    items: [],
    total: 0,
    offset: 0,
    limit: 80,
    isLoading: false,
    hasLoaded: false,
  })
})

test('local library empty state derives from overview-only data', () => {
  assert.equal(
    getLocalLibraryEmptyState(EMPTY_LOCAL_LIBRARY_OVERVIEW, 0),
    'missing-roots'
  )
  assert.equal(
    getLocalLibraryEmptyState(EMPTY_LOCAL_LIBRARY_OVERVIEW, 2),
    'not-scanned'
  )

  assert.equal(
    getLocalLibraryEmptyState(
      {
        ...EMPTY_LOCAL_LIBRARY_OVERVIEW,
        stats: {
          ...EMPTY_LOCAL_LIBRARY_OVERVIEW.stats,
          lastScannedAt: Date.now(),
        },
      },
      2
    ),
    'empty-library'
  )

  assert.deepEqual(EMPTY_LOCAL_LIBRARY_SONG_SCOPE, {
    type: 'all',
    key: null,
    value: null,
    artistName: null,
  })
})
