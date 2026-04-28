import assert from 'node:assert/strict'
import test from 'node:test'

import { createMusicSourceSettingsSaveEntries } from '../src/renderer/pages/Settings/components/music-source-settings.model.ts'
import {
  BUILTIN_SEARCH_SOURCE_IDS,
  createBuiltinSearchSourceTabs,
  createSystemSearchSourceTab,
} from '../src/renderer/components/SearchDialog/model/search-source-tabs.model.ts'
import {
  createSearchPlatformRequestKey,
  createEmptySearchPlatformStates,
  mergeSearchPlatformPage,
  shouldRequestSearchPlatformNextPage,
  shouldRequestSearchPlatform,
  updateSearchPlatformState,
} from '../src/renderer/components/SearchDialog/model/search-platform-state.model.ts'

test('builtin search source tabs expose the fixed five-platform layout', () => {
  assert.deepEqual(BUILTIN_SEARCH_SOURCE_IDS, ['wy', 'tx', 'kw', 'kg', 'mg'])
  assert.deepEqual(createSystemSearchSourceTab(), {
    id: 'wy',
    name: '网易云',
    providerType: 'builtin',
  })
  assert.deepEqual(createBuiltinSearchSourceTabs(), [
    { id: 'wy', name: '网易云', providerType: 'builtin' },
    { id: 'tx', name: 'QQ', providerType: 'builtin' },
    { id: 'kw', name: '酷我', providerType: 'builtin' },
    { id: 'kg', name: '酷狗', providerType: 'builtin' },
    { id: 'mg', name: '咪咕', providerType: 'builtin' },
  ])
})

test('search platform cache only refetches when keyword snapshot mismatches or loading is idle', () => {
  const states = createEmptySearchPlatformStates(['wy', 'tx'])

  assert.equal(shouldRequestSearchPlatform(states.wy, 'hello'), true)

  const loadingState = updateSearchPlatformState(states, 'wy', {
    keywordSnapshot: '',
    items: [],
    page: 0,
    limit: 20,
    total: 0,
    hasMore: false,
    requestKey: null,
    loading: true,
    error: null,
    hasSearched: false,
  })
  assert.equal(shouldRequestSearchPlatform(loadingState.wy, 'hello'), false)

  const next = updateSearchPlatformState(states, 'wy', {
    keywordSnapshot: 'hello',
    items: [{ id: 1 }],
    page: 1,
    limit: 20,
    total: 1,
    hasMore: false,
    requestKey: null,
    hasSearched: true,
    loading: false,
    error: null,
  })

  assert.equal(shouldRequestSearchPlatform(next.wy, 'hello'), false)
  assert.equal(shouldRequestSearchPlatform(next.wy, 'world'), true)
})

test('search platform state initializes pagination fields', () => {
  const states = createEmptySearchPlatformStates(['wy'])

  assert.deepEqual(states.wy, {
    keywordSnapshot: '',
    items: [],
    page: 0,
    limit: 20,
    total: 0,
    hasMore: false,
    requestKey: null,
    loading: false,
    error: null,
    hasSearched: false,
  })
})

test('mergeSearchPlatformPage replaces first page and appends next pages', () => {
  const initial = createEmptySearchPlatformStates<{ id: number }>(['wy']).wy
  const firstPage = mergeSearchPlatformPage(initial, {
    keyword: '晴天',
    page: 1,
    limit: 2,
    total: 3,
    items: [{ id: 1 }, { id: 2 }],
    requestKey: createSearchPlatformRequestKey('wy', '晴天', 1),
  })

  assert.deepEqual(firstPage.items, [{ id: 1 }, { id: 2 }])
  assert.equal(firstPage.page, 1)
  assert.equal(firstPage.hasMore, true)
  assert.equal(firstPage.loading, false)
  assert.equal(firstPage.hasSearched, true)

  const secondPage = mergeSearchPlatformPage(firstPage, {
    keyword: '晴天',
    page: 2,
    limit: 2,
    total: 3,
    items: [{ id: 3 }],
    requestKey: createSearchPlatformRequestKey('wy', '晴天', 2),
  })

  assert.deepEqual(secondPage.items, [{ id: 1 }, { id: 2 }, { id: 3 }])
  assert.equal(secondPage.page, 2)
  assert.equal(secondPage.hasMore, false)
})

test('mergeSearchPlatformPage can remove duplicate result identities across pages', () => {
  const initial = createEmptySearchPlatformStates<{ id: number; key: string }>([
    'kg',
  ]).kg
  const firstPage = mergeSearchPlatformPage(
    initial,
    {
      keyword: '张韶涵',
      page: 1,
      limit: 3,
      total: 5,
      items: [
        { id: 1, key: 'kg:audio-1' },
        { id: 1, key: 'kg:audio-1' },
        { id: 2, key: 'kg:audio-2' },
      ],
      requestKey: createSearchPlatformRequestKey('kg', '张韶涵', 1),
    },
    item => item.key
  )

  assert.deepEqual(firstPage.items, [
    { id: 1, key: 'kg:audio-1' },
    { id: 2, key: 'kg:audio-2' },
  ])

  const secondPage = mergeSearchPlatformPage(
    firstPage,
    {
      keyword: '张韶涵',
      page: 2,
      limit: 3,
      total: 5,
      items: [
        { id: 2, key: 'kg:audio-2' },
        { id: 3, key: 'kg:audio-3' },
      ],
      requestKey: createSearchPlatformRequestKey('kg', '张韶涵', 2),
    },
    item => item.key
  )

  assert.deepEqual(secondPage.items, [
    { id: 1, key: 'kg:audio-1' },
    { id: 2, key: 'kg:audio-2' },
    { id: 3, key: 'kg:audio-3' },
  ])
})

test('next page requests require same keyword, idle state, and hasMore', () => {
  const state = mergeSearchPlatformPage(
    createEmptySearchPlatformStates<{ id: number }>(['tx']).tx,
    {
      keyword: 'hello',
      page: 1,
      limit: 2,
      total: 4,
      items: [{ id: 1 }, { id: 2 }],
      requestKey: createSearchPlatformRequestKey('tx', 'hello', 1),
    }
  )

  assert.equal(shouldRequestSearchPlatformNextPage(state, 'hello'), true)
  assert.equal(shouldRequestSearchPlatformNextPage(state, 'world'), false)
  assert.equal(
    shouldRequestSearchPlatformNextPage({ ...state, loading: true }, 'hello'),
    false
  )
  assert.equal(
    shouldRequestSearchPlatformNextPage({ ...state, hasMore: false }, 'hello'),
    false
  )
})

test('music source settings save entries no longer include search quality', () => {
  const entries = createMusicSourceSettingsSaveEntries({
    enhancedSourceModules: ['unm'],
    luoxueSourceEnabled: true,
    customMusicApiEnabled: true,
    customMusicApiUrl: ' https://api.example.com ',
  })

  assert.deepEqual(entries, [
    ['musicSourceProviders', []],
    ['enhancedSourceModules', ['unm']],
    ['luoxueSourceEnabled', true],
    ['customMusicApiEnabled', true],
    ['customMusicApiUrl', 'https://api.example.com'],
  ])
})
