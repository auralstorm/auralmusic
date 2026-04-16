import type { AppConfig } from '../../../main/config/types.ts'
import { isAuthenticatedForMusicResolution } from '../../../shared/music-source/auth-state.ts'
import { buildResolverPolicy } from '../../../shared/music-source/policy.ts'
import type {
  MusicResolverId,
  ResolveContext,
  ResolverPolicy,
} from '../../../shared/music-source/types.ts'
import type { AuthSession, AuthUser } from '../../../shared/auth.ts'
import type {
  PlaybackTrack,
  SongUrlV1Result,
} from '../../../shared/playback.ts'
import { createBuiltinUnblockPlaybackProvider } from './providers/builtin-unblock-playback-provider.ts'
import { createCustomApiPlaybackProvider } from './providers/custom-api-playback-provider.ts'
import { createLxPlaybackProvider } from './providers/lx-playback-provider.ts'
import { createOfficialPlaybackProvider } from './providers/official-playback-provider.ts'

type MaybePromise<T> = T | Promise<T>
type LoginStatus = 'anonymous' | 'authenticated' | 'expired'

export type PlaybackResolverAuthState = {
  user?: AuthUser | null
  session?: AuthSession | null
  loginStatus?: LoginStatus | null
}

export type PlaybackResolverConfig = ResolveContext['config'] &
  Partial<Omit<AppConfig, keyof ResolveContext['config']>>

export type PlaybackSourceProviderOptions = {
  track: PlaybackTrack
  context: ResolveContext
  policy: ResolverPolicy
  config: PlaybackResolverConfig
}

export interface PlaybackSourceProvider {
  resolve: (
    options: PlaybackSourceProviderOptions
  ) => Promise<SongUrlV1Result | null>
}

export type PlaybackSourceTraceEvent =
  | {
      type: 'start'
      trackId: number
      isAuthenticated: boolean
      resolverOrder: MusicResolverId[]
      builtinPlatforms: ResolverPolicy['builtinPlatforms']
    }
  | {
      type: 'try' | 'miss' | 'hit' | 'skip'
      trackId: number
      resolverId: MusicResolverId
      reason?: string
    }
  | {
      type: 'error'
      trackId: number
      resolverId: MusicResolverId
      error: unknown
    }

export interface PlaybackSourceTraceLogger {
  log: (event: PlaybackSourceTraceEvent) => void
}

export type PlaybackSourceResolverDeps = {
  getAuthState?: () => MaybePromise<PlaybackResolverAuthState>
  getConfig?: () => MaybePromise<PlaybackResolverConfig>
  providers?: Partial<Record<MusicResolverId, PlaybackSourceProvider>>
  trace?: PlaybackSourceTraceLogger
}

type ResolvePlaybackSourceOptions = {
  track: PlaybackTrack
  authState?: PlaybackResolverAuthState
  config?: PlaybackResolverConfig
}

async function getDefaultAuthState(): Promise<PlaybackResolverAuthState> {
  const { useAuthStore } = await import('../../stores/auth-store.ts')
  return useAuthStore.getState()
}

async function getDefaultConfig(): Promise<PlaybackResolverConfig> {
  const { useConfigStore } = await import('../../stores/config-store.ts')
  return useConfigStore.getState().config
}

function toResolveContext(
  authState: PlaybackResolverAuthState,
  config: PlaybackResolverConfig
): ResolveContext {
  return {
    scene: 'playback',
    isAuthenticated: isAuthenticatedForMusicResolution({
      loginStatus: authState.loginStatus,
      userId: authState.user?.userId ?? authState.session?.userId ?? null,
      cookie: authState.session?.cookie ?? null,
    }),
    config: {
      musicSourceEnabled: config.musicSourceEnabled,
      musicSourceProviders: config.musicSourceProviders,
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
  const getAuthState = deps.getAuthState ?? getDefaultAuthState
  const getConfig = deps.getConfig ?? getDefaultConfig
  const trace = deps.trace ?? getDefaultTraceLogger()
  const providers = {
    ...createDefaultProviders(),
    ...deps.providers,
  }

  return async function resolvePlaybackSource(
    options: ResolvePlaybackSourceOptions
  ): Promise<SongUrlV1Result | null> {
    const authState = options.authState ?? (await getAuthState())
    const config = options.config ?? (await getConfig())
    const context = toResolveContext(authState, config)
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

export const resolvePlaybackSource = createPlaybackSourceResolver()
