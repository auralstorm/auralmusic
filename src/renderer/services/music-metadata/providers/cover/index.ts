import { normalizeBuiltinPlatformSource } from '../../platform-metadata.utils.ts'
import type {
  BuiltinCoverProvider,
  BuiltinCoverProviderRegistry,
} from '../../platform-metadata.types.ts'
import { kgBuiltinCoverProvider } from './kg-builtin-cover-provider.ts'
import { kwBuiltinCoverProvider } from './kw-builtin-cover-provider.ts'
import { mgBuiltinCoverProvider } from './mg-builtin-cover-provider.ts'
import { txBuiltinCoverProvider } from './tx-builtin-cover-provider.ts'
import { wyBuiltinCoverProvider } from './wy-builtin-cover-provider.ts'

export function createBuiltinCoverProviders(): BuiltinCoverProviderRegistry {
  return {
    wy: wyBuiltinCoverProvider,
    tx: txBuiltinCoverProvider,
    kw: kwBuiltinCoverProvider,
    kg: kgBuiltinCoverProvider,
    mg: mgBuiltinCoverProvider,
  }
}

export function readBuiltinCoverProvider(
  providers: BuiltinCoverProviderRegistry | null | undefined,
  source: unknown
): BuiltinCoverProvider | null {
  const normalizedSource = normalizeBuiltinPlatformSource(source)
  if (!providers || !normalizedSource) {
    return null
  }

  return providers[normalizedSource] ?? null
}

export const builtinCoverProviders: BuiltinCoverProviderRegistry =
  createBuiltinCoverProviders()

export * from './wy-builtin-cover-provider.ts'
export * from './tx-builtin-cover-provider.ts'
export * from './kw-builtin-cover-provider.ts'
export * from './kg-builtin-cover-provider.ts'
export * from './mg-builtin-cover-provider.ts'
