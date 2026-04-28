import type { SearchSourceTab } from '../types/search-dialog.types.ts'

export const BUILTIN_SEARCH_SOURCE_TABS: SearchSourceTab[] = [
  {
    id: 'wy',
    name: '🌤️', // 网易云
    providerType: 'builtin',
  },
  {
    id: 'tx',
    name: '🐧', // qq
    providerType: 'builtin',
  },
  {
    id: 'kw',
    name: '🦹', // 酷我
    providerType: 'builtin',
  },
  {
    id: 'kg',
    name: '🐕', // 酷狗
    providerType: 'builtin',
  },
  {
    id: 'mg',
    name: '😺', // 咪咕
    providerType: 'builtin',
  },
]

export const BUILTIN_SEARCH_SOURCE_IDS = BUILTIN_SEARCH_SOURCE_TABS.map(
  source => source.id
)

export function createSystemSearchSourceTab(): SearchSourceTab {
  return BUILTIN_SEARCH_SOURCE_TABS[0]
}

export function createBuiltinSearchSourceTabs() {
  return [...BUILTIN_SEARCH_SOURCE_TABS]
}
