import type {
  BuiltinSearchSourceId,
  BuiltinSongSearchOptions,
  BuiltinSongSearchProvider,
} from './builtin-search.types.ts'
import { kgBuiltinSearchProvider } from './providers/kg-builtin-search-provider.ts'
import { kwBuiltinSearchProvider } from './providers/kw-builtin-search-provider.ts'
import { mgBuiltinSearchProvider } from './providers/mg-builtin-search-provider.ts'
import { txBuiltinSearchProvider } from './providers/tx-builtin-search-provider.ts'
import { wyBuiltinSearchProvider } from './providers/wy-builtin-search-provider.ts'

const BUILTIN_SEARCH_PROVIDERS: Record<
  BuiltinSearchSourceId,
  BuiltinSongSearchProvider
> = {
  wy: wyBuiltinSearchProvider,
  tx: txBuiltinSearchProvider,
  kw: kwBuiltinSearchProvider,
  kg: kgBuiltinSearchProvider,
  mg: mgBuiltinSearchProvider,
}

export function getBuiltinSearchProvider(sourceId: BuiltinSearchSourceId) {
  return BUILTIN_SEARCH_PROVIDERS[sourceId]
}

export async function searchSongsWithBuiltinProvider(
  sourceId: BuiltinSearchSourceId,
  options: BuiltinSongSearchOptions
) {
  return BUILTIN_SEARCH_PROVIDERS[sourceId].search(options)
}

export * from './builtin-search.types.ts'
export * from './providers/wy-builtin-search-provider.ts'
export * from './providers/tx-builtin-search-provider.ts'
export * from './providers/kw-builtin-search-provider.ts'
export * from './providers/kg-builtin-search-provider.ts'
export * from './providers/mg-builtin-search-provider.ts'
