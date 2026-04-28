import type { BuiltinPlatformId } from './types.ts'

/** 内置解灰模块支持的平台白名单，lxMusic 单独走脚本解析器，不归到这里。 */
const BUILTIN_PLATFORM_IDS = new Set<BuiltinPlatformId>([
  'migu',
  'kugou',
  'pyncmd',
  'bilibili',
])

/** 从用户配置中筛出内置平台，保持顺序、去重并过滤未知 provider。 */
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
