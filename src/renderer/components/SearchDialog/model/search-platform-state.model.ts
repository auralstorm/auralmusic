import type {
  SearchPlatformState,
  SearchPlatformStates,
} from '../types/search-dialog.types.ts'

const DEFAULT_SEARCH_PLATFORM_LIMIT = 20

function createEmptySearchPlatformState<T>(): SearchPlatformState<T> {
  return {
    keywordSnapshot: '',
    items: [],
    page: 0,
    limit: DEFAULT_SEARCH_PLATFORM_LIMIT,
    total: 0,
    hasMore: false,
    requestKey: null,
    loading: false,
    error: null,
    hasSearched: false,
  }
}

export function createEmptySearchPlatformStates<T>(
  sourceIds: string[]
): SearchPlatformStates<T> {
  return Object.fromEntries(
    sourceIds.map(key => [key, createEmptySearchPlatformState<T>()])
  ) as SearchPlatformStates<T>
}

export function shouldRequestSearchPlatform<T>(
  state: SearchPlatformState<T>,
  keyword: string
) {
  const normalizedKeyword = keyword.trim()
  if (!normalizedKeyword) {
    return false
  }

  if (state.loading) {
    return false
  }

  return !state.hasSearched || state.keywordSnapshot !== normalizedKeyword
}

export function shouldRequestSearchPlatformNextPage<T>(
  state: SearchPlatformState<T>,
  keyword: string
) {
  const normalizedKeyword = keyword.trim()
  if (!normalizedKeyword) {
    return false
  }

  if (state.loading || !state.hasSearched || !state.hasMore) {
    return false
  }

  return state.keywordSnapshot === normalizedKeyword
}

export function createSearchPlatformRequestKey(
  sourceId: string,
  keyword: string,
  page: number
) {
  return `${sourceId}:${keyword.trim()}:${page}`
}

export function mergeSearchPlatformPage<T>(
  state: SearchPlatformState<T>,
  payload: {
    keyword: string
    page: number
    limit: number
    total: number
    items: T[]
    requestKey: string
  }
): SearchPlatformState<T> {
  const normalizedKeyword = payload.keyword.trim()
  const nextItems =
    payload.page <= 1 ? payload.items : [...state.items, ...payload.items]

  return {
    keywordSnapshot: normalizedKeyword,
    items: nextItems,
    page: payload.page,
    limit: payload.limit,
    total: payload.total,
    hasMore: nextItems.length < payload.total && payload.items.length > 0,
    requestKey: null,
    loading: false,
    error: null,
    hasSearched: true,
  }
}

export function updateSearchPlatformState<T>(
  states: SearchPlatformStates<T>,
  key: string,
  nextState: SearchPlatformState<T>
) {
  return {
    ...states,
    [key]: nextState,
  }
}
