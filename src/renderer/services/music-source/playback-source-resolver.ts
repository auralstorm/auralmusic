import type {
  PlaybackResolverAuthState,
  PlaybackResolverConfig,
  PlaybackSourceResolverDeps,
} from '@/types/core'
import { createPlaybackSourceResolver as createPlaybackSourceResolverBase } from './model/playback-source-resolver.model.ts'
import { useAuthStore } from '../../stores/auth-store.ts'
import { useConfigStore } from '../../stores/config-store.ts'
import { createRendererLogger } from '../../lib/logger.ts'
import type { PlaybackSourceTraceEvent } from '@/types/core'

const playbackSourceLogger = createRendererLogger('playback-source')

async function getDefaultAuthState(): Promise<PlaybackResolverAuthState> {
  return useAuthStore.getState()
}

async function getDefaultConfig(): Promise<PlaybackResolverConfig> {
  return useConfigStore.getState().config
}

function writePlaybackSourceTrace(event: PlaybackSourceTraceEvent) {
  const meta = {
    builtinPlatforms:
      'builtinPlatforms' in event ? event.builtinPlatforms : undefined,
    error: 'error' in event ? event.error : undefined,
    isAuthenticated:
      'isAuthenticated' in event ? event.isAuthenticated : undefined,
    reason: 'reason' in event ? event.reason : undefined,
    resolverId: 'resolverId' in event ? event.resolverId : undefined,
    resolverOrder: 'resolverOrder' in event ? event.resolverOrder : undefined,
    trackId: event.trackId,
    type: event.type,
  }

  if (event.type === 'error') {
    playbackSourceLogger.warn('playback source resolver error', meta)
    return
  }

  playbackSourceLogger.debug(`playback source resolver ${event.type}`, meta)
}

export function createPlaybackSourceResolver(
  deps: PlaybackSourceResolverDeps = {}
) {
  return createPlaybackSourceResolverBase({
    ...deps,
    getAuthState: deps.getAuthState ?? getDefaultAuthState,
    getConfig: deps.getConfig ?? getDefaultConfig,
    trace: deps.trace ?? {
      log: writePlaybackSourceTrace,
    },
  })
}

export const resolvePlaybackSource = createPlaybackSourceResolver()
