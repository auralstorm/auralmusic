import { normalizeBuiltinPlatforms } from './builtin-platforms.ts'
import type {
  MusicResolverId,
  ResolveContext,
  ResolverPolicy,
} from './types.ts'

/** 去重并过滤空解析器，保证解析顺序稳定且不会重复请求同一来源。 */
function compactResolvers(
  resolvers: Array<MusicResolverId | null | undefined>
): MusicResolverId[] {
  const result: MusicResolverId[] = []
  const seen = new Set<MusicResolverId>()

  for (const resolver of resolvers) {
    if (!resolver || seen.has(resolver)) {
      continue
    }

    seen.add(resolver)
    result.push(resolver)
  }

  return result
}

/**
 * 构建音乐资源解析策略。
 *
 * 这里统一决定官方接口、内置解灰、LX 脚本和自定义 API 的尝试顺序；
 * 播放和下载共用同一策略，避免两条链路对付费/VIP/锁定平台的判断不一致。
 */
export function buildResolverPolicy(context: ResolveContext): ResolverPolicy {
  const builtinPlatforms = normalizeBuiltinPlatforms(
    context.config.musicSourceProviders
  )
  const isLockedToNonWyPlatform =
    typeof context.lockedPlatform === 'string' &&
    context.lockedPlatform.trim().length > 0 &&
    context.lockedPlatform !== 'wy'
  const enhancedSourceModules = context.config.enhancedSourceModules
  const hasExplicitEnhancedModules = Array.isArray(enhancedSourceModules)
  const hasEnabledEnhancedModules =
    !hasExplicitEnhancedModules || enhancedSourceModules.length > 0
  const builtinUnblockEnabled =
    hasEnabledEnhancedModules || builtinPlatforms.length > 0
  const customApiEnabled =
    context.config.customMusicApiEnabled &&
    context.config.customMusicApiUrl.trim().length > 0
  const shouldBypassOfficial =
    // 锁定非网易平台或非 VIP 付费歌曲时，优先跳过官方接口，减少必然失败的请求。
    isLockedToNonWyPlatform ||
    (context.isAuthenticated && !context.isVip && context.trackFee !== 0)
  const resolverOrder: MusicResolverId[] = context.config.musicSourceEnabled
    ? compactResolvers(
        isLockedToNonWyPlatform
          ? [
              context.config.luoxueSourceEnabled ? 'lxMusic' : null,
              customApiEnabled ? 'customApi' : null,
            ]
          : context.isAuthenticated && !shouldBypassOfficial
            ? [
                'official',
                builtinUnblockEnabled ? 'builtinUnblock' : null,
                context.config.luoxueSourceEnabled ? 'lxMusic' : null,
                customApiEnabled ? 'customApi' : null,
              ]
            : [
                builtinUnblockEnabled ? 'builtinUnblock' : null,
                context.config.luoxueSourceEnabled ? 'lxMusic' : null,
                customApiEnabled ? 'customApi' : null,
              ]
      )
    : ['official']

  return {
    resolverOrder,
    builtinPlatforms,
  }
}
