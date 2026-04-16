import type { BuiltinPlatformId } from './types.ts'

const BUILTIN_PLATFORM_IDS = new Set<BuiltinPlatformId>([
  'migu',
  'kugou',
  'pyncmd',
  'bilibili',
])

export function normalizeBuiltinPlatforms(
  providers: readonly unknown[] | null | undefined
): BuiltinPlatformId[] {
  if (!Array.isArray(providers) || providers.length === 0) {
    return []
  }

  const normalized: BuiltinPlatformId[] = []
  const seen = new Set<BuiltinPlatformId>()

  for (const provider of providers) {
    if (typeof provider !== 'string') {
      continue
    }

    if (
      provider === 'lxMusic' ||
      !BUILTIN_PLATFORM_IDS.has(provider as BuiltinPlatformId)
    ) {
      continue
    }

    const builtinPlatform = provider as BuiltinPlatformId
    if (seen.has(builtinPlatform)) {
      continue
    }

    seen.add(builtinPlatform)
    normalized.push(builtinPlatform)
  }

  return normalized
}
