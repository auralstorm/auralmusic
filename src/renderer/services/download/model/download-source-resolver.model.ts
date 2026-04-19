import { createDownloadQualityFallbackChain } from '../../../../shared/download.ts'
import type {
  MusicResolverId,
  ResolveContext,
} from '../../../../shared/music-source/index.ts'
import { buildResolverPolicy } from '../../../../shared/music-source/index.ts'
import { createBuiltinUnblockDownloadProvider } from '../providers/builtin-unblock-download-provider.ts'
import { createCustomApiDownloadProvider } from '../providers/custom-api-download-provider.ts'
import { createLxDownloadProvider } from '../providers/lx-download-provider.ts'
import { createOfficialDownloadProvider } from '../providers/official-download-provider.ts'
import type {
  DownloadResolverConfig,
  DownloadResolverProvider,
  DownloadSourceResolverDeps,
  ResolveDownloadSourceOptions,
  ResolvedDownloadSource,
} from '@/types/core'

function createMissingDownloadRuntimeStateError(): Error {
  return new Error(
    'createDownloadSourceResolver requires config and authentication getters when not provided by deps'
  )
}

function createDefaultProviders(): Record<
  MusicResolverId,
  DownloadResolverProvider
> {
  return {
    official: createOfficialDownloadProvider(),
    builtinUnblock: createBuiltinUnblockDownloadProvider(),
    lxMusic: createLxDownloadProvider(),
    customApi: createCustomApiDownloadProvider(),
  }
}

function toResolveContext(
  isAuthenticated: boolean,
  config: DownloadResolverConfig
): ResolveContext {
  return {
    scene: 'download',
    isAuthenticated,
    config: {
      musicSourceEnabled: config.musicSourceEnabled,
      musicSourceProviders: config.musicSourceProviders,
      luoxueSourceEnabled: config.luoxueSourceEnabled,
      customMusicApiEnabled: config.customMusicApiEnabled,
      customMusicApiUrl: config.customMusicApiUrl,
      enhancedSourceModules: config.enhancedSourceModules,
    },
  }
}

export function createDownloadSourceResolver(
  deps: DownloadSourceResolverDeps = {}
) {
  const getConfig = deps.getConfig
  const getIsAuthenticated = deps.getIsAuthenticated
  const providers = createDefaultProviders()

  return async function resolveDownloadSource(
    options: ResolveDownloadSourceOptions
  ): Promise<ResolvedDownloadSource | null> {
    if (options.policy !== 'strict' && options.policy !== 'fallback') {
      return null
    }

    const config = getConfig
      ? await getConfig()
      : (() => {
          throw createMissingDownloadRuntimeStateError()
        })()
    const isAuthenticated = await (
      getIsAuthenticated
        ? getIsAuthenticated
        : () => {
            throw createMissingDownloadRuntimeStateError()
          }
    )()
    const context = toResolveContext(isAuthenticated, config)
    const resolverPolicy = buildResolverPolicy(context)
    const levels =
      options.policy === 'strict'
        ? [options.requestedQuality]
        : createDownloadQualityFallbackChain(options.requestedQuality)

    for (const level of levels) {
      for (const resolverId of resolverPolicy.resolverOrder) {
        const provider = providers[resolverId]
        const result = await provider.resolve({
          track: options.track,
          quality: level,
          context,
          policy: resolverPolicy,
          config,
          deps,
        })

        if (result?.url) {
          return result
        }
      }
    }

    return null
  }
}
