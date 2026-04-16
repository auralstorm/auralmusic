import { isAuthenticatedForMusicResolution } from '../../../shared/music-source/auth-state.ts'
import { buildResolverPolicy } from '../../../shared/music-source/policy.ts'
import type {
  MusicResolverId,
  ResolveContext,
} from '../../../shared/music-source/types.ts'
import { createDownloadQualityFallbackChain } from '../../../main/download/download-types.ts'
import { createBuiltinUnblockDownloadProvider } from './providers/builtin-unblock-download-provider.ts'
import { createCustomApiDownloadProvider } from './providers/custom-api-download-provider.ts'
import { createLxDownloadProvider } from './providers/lx-download-provider.ts'
import { createOfficialDownloadProvider } from './providers/official-download-provider.ts'
import type {
  DownloadResolverConfig,
  DownloadResolutionPolicy,
  DownloadResolverProvider,
  DownloadSourceResolverDeps,
  DownloadTrack,
  ResolvedDownloadSource,
} from './providers/types.ts'

type ResolveDownloadSourceOptions = {
  track: DownloadTrack
  requestedQuality: Parameters<typeof createDownloadQualityFallbackChain>[0]
  policy: DownloadResolutionPolicy
}

type MaybePromise<T> = T | Promise<T>

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

async function getDefaultConfig(): Promise<DownloadResolverConfig> {
  const { useConfigStore } = await import('../../stores/config-store.ts')
  return useConfigStore.getState().config
}

async function getDefaultIsAuthenticated(): Promise<boolean> {
  const { useAuthStore } = await import('../../stores/auth-store.ts')
  const authState = useAuthStore.getState()
  return isAuthenticatedForMusicResolution({
    loginStatus: authState.loginStatus,
    userId: authState.user?.userId ?? authState.session?.userId ?? null,
    cookie: authState.session?.cookie ?? null,
  })
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
    },
  }
}

export type {
  DownloadResolutionPolicy,
  DownloadSourceResolverDeps,
  ResolvedDownloadSource,
} from './providers/types.ts'

export function createDownloadSourceResolver(
  deps: DownloadSourceResolverDeps = {}
) {
  const getConfig = deps.getConfig ?? getDefaultConfig
  const getIsAuthenticated =
    deps.getIsAuthenticated ?? getDefaultIsAuthenticated
  const providers = createDefaultProviders()

  return async function resolveDownloadSource(
    options: ResolveDownloadSourceOptions
  ): Promise<ResolvedDownloadSource | null> {
    if (options.policy !== 'strict' && options.policy !== 'fallback') {
      return null
    }

    const config = await getConfig()
    const isAuthenticated = await (
      getIsAuthenticated as () => MaybePromise<boolean>
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
