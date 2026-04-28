import type {
  MusicResolverId,
  ResolveContext,
} from '../../../../shared/music-source/index.ts'
import {
  buildResolverPolicy,
  isAuthenticatedForMusicResolution,
} from '../../../../shared/music-source/index.ts'
import type {
  PlaybackTrack,
  SongUrlV1Result,
} from '../../../../shared/playback.ts'
import { createBuiltinUnblockPlaybackProvider } from '../providers/builtin-unblock-playback-provider.ts'
import { createCustomApiPlaybackProvider } from '../providers/custom-api-playback-provider.ts'
import { createLxPlaybackProvider } from '../providers/lx-playback-provider.ts'
import { createOfficialPlaybackProvider } from '../providers/official-playback-provider.ts'
import type {
  PlaybackResolverAuthState,
  PlaybackResolverConfig,
  PlaybackSourceProvider,
  PlaybackSourceResolverDeps,
  PlaybackSourceTraceEvent,
  PlaybackSourceTraceLogger,
  ResolvePlaybackSourceOptions,
} from '@/types/core'

function createMissingPlaybackRuntimeStateError(): Error {
  return new Error(
    'createPlaybackSourceResolver requires authState and config getters when options do not provide them'
  )
}

function toResolveContext(
  authState: PlaybackResolverAuthState,
  config: PlaybackResolverConfig,
  track: PlaybackTrack
): ResolveContext {
  return {
    scene: 'playback',
    isAuthenticated: isAuthenticatedForMusicResolution({
      loginStatus: authState.loginStatus,
      userId: authState.user?.userId ?? authState.session?.userId ?? null,
      cookie: authState.session?.cookie ?? null,
    }),
    isVip: authState.session?.isVip === true,
    trackFee: typeof track.fee === 'number' ? track.fee : 0,
    lockedPlatform: track.lockedPlatform,
    lockedLxSourceId: track.lockedLxSourceId,
    preferredQuality: track.preferredQuality,
    config: {
      musicSourceEnabled: config.musicSourceEnabled,
      musicSourceProviders: config.musicSourceProviders,
      enhancedSourceModules: config.enhancedSourceModules,
      luoxueSourceEnabled: config.luoxueSourceEnabled,
      customMusicApiEnabled: config.customMusicApiEnabled,
      customMusicApiUrl: config.customMusicApiUrl,
      quality: config.quality,
    },
  }
}

function createDefaultProviders(): Record<
  MusicResolverId,
  PlaybackSourceProvider
> {
  return {
    official: createOfficialPlaybackProvider(),
    builtinUnblock: createBuiltinUnblockPlaybackProvider(),
    lxMusic: createLxPlaybackProvider(),
    customApi: createCustomApiPlaybackProvider(),
  }
}

function formatTraceEvent(event: PlaybackSourceTraceEvent): string {
  switch (event.type) {
    case 'start':
      return [
        `track=${event.trackId}`,
        `auth=${event.isAuthenticated}`,
        `order=${event.resolverOrder.join(' -> ') || 'none'}`,
        `builtin=${event.builtinPlatforms.join(',') || 'none'}`,
      ].join(' ')
    case 'error':
      return `track=${event.trackId} resolver=${event.resolverId} error`
    case 'skip':
      return `track=${event.trackId} resolver=${event.resolverId} skip reason=${event.reason ?? 'unknown'}`
    default:
      return `track=${event.trackId} resolver=${event.resolverId} ${event.type}`
  }
}

function createConsoleTraceLogger(): PlaybackSourceTraceLogger {
  return {
    log: event => {
      const prefix = `[PlaybackSourceResolver] ${event.type}`
      const message = formatTraceEvent(event)

      if (event.type === 'error') {
        console.warn(prefix, message, event.error)
        return
      }

      console.info(prefix, message)
    },
  }
}

function getDefaultTraceLogger(): PlaybackSourceTraceLogger | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  return createConsoleTraceLogger()
}

export function createPlaybackSourceResolver(
  deps: PlaybackSourceResolverDeps = {}
) {
  const getAuthState = deps.getAuthState
  const getConfig = deps.getConfig
  const trace = deps.trace ?? getDefaultTraceLogger()
  const providers = {
    ...createDefaultProviders(),
    ...deps.providers,
  }

  return async function resolvePlaybackSource(
    options: ResolvePlaybackSourceOptions
  ): Promise<SongUrlV1Result | null> {
    const authState =
      options.authState ??
      (getAuthState
        ? await getAuthState()
        : (() => {
            throw createMissingPlaybackRuntimeStateError()
          })())
    const config =
      options.config ??
      (getConfig
        ? await getConfig()
        : (() => {
            throw createMissingPlaybackRuntimeStateError()
          })())
    const context = toResolveContext(authState, config, options.track)
    const policy = buildResolverPolicy(context)
    const trackId = options.track.id

    trace?.log({
      type: 'start',
      trackId,
      isAuthenticated: context.isAuthenticated,
      resolverOrder: [...policy.resolverOrder],
      builtinPlatforms: [...policy.builtinPlatforms],
    })

    for (const resolverId of policy.resolverOrder) {
      const provider = providers[resolverId]

      if (!provider) {
        trace?.log({
          type: 'skip',
          trackId,
          resolverId,
          reason: 'provider-missing',
        })
        continue
      }

      trace?.log({
        type: 'try',
        trackId,
        resolverId,
      })

      let result: SongUrlV1Result | null

      try {
        result = await provider.resolve({
          track: options.track,
          context,
          policy,
          config,
        })
      } catch (error) {
        trace?.log({
          type: 'error',
          trackId,
          resolverId,
          error,
        })
        throw error
      }

      if (result?.url) {
        trace?.log({
          type: 'hit',
          trackId,
          resolverId,
        })
        return result
      }

      trace?.log({
        type: 'miss',
        trackId,
        resolverId,
      })
    }

    return null
  }
}
