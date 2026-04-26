import { normalizeBuiltinPlatformSource } from '../../platform-metadata.utils.ts'
import type {
  BuiltinLyricProvider,
  BuiltinLyricProviderRegistry,
} from '../../platform-metadata.types.ts'
import { kgBuiltinLyricProvider } from './kg-builtin-lyric-provider.ts'
import { kwBuiltinLyricProvider } from './kw-builtin-lyric-provider.ts'
import { mgBuiltinLyricProvider } from './mg-builtin-lyric-provider.ts'
import { txBuiltinLyricProvider } from './tx-builtin-lyric-provider.ts'
import { wyBuiltinLyricProvider } from './wy-builtin-lyric-provider.ts'

export function createBuiltinLyricProviders(): BuiltinLyricProviderRegistry {
  return {
    wy: wyBuiltinLyricProvider,
    tx: txBuiltinLyricProvider,
    kw: kwBuiltinLyricProvider,
    kg: kgBuiltinLyricProvider,
    mg: mgBuiltinLyricProvider,
  }
}

export function readBuiltinLyricProvider(
  providers: BuiltinLyricProviderRegistry | null | undefined,
  source: unknown
): BuiltinLyricProvider | null {
  const normalizedSource = normalizeBuiltinPlatformSource(source)
  if (!providers || !normalizedSource) {
    return null
  }

  return providers[normalizedSource] ?? null
}

export const builtinLyricProviders: BuiltinLyricProviderRegistry =
  createBuiltinLyricProviders()

export * from './wy-builtin-lyric-provider.ts'
export * from './tx-builtin-lyric-provider.ts'
export * from './kw-builtin-lyric-provider.ts'
export * from './kg-builtin-lyric-provider.ts'
export * from './mg-builtin-lyric-provider.ts'
