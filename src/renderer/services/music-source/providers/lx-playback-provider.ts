import type {
  AudioQualityLevel,
  MusicSourceProvider,
} from '../../../../main/config/types.ts'
import { resolveTrackWithLxMusicSource } from '../lx-playback-resolver.ts'
import type {
  PlaybackResolverConfig,
  PlaybackSourceProvider,
  PlaybackSourceProviderOptions,
} from '../playback-source-resolver.ts'

function getQuality(options: PlaybackSourceProviderOptions): AudioQualityLevel {
  return options.context.config.quality ?? 'higher'
}

type LxPlaybackConfig = PlaybackResolverConfig & {
  musicSourceProviders: MusicSourceProvider[]
  activeLuoxueMusicSourceScriptId: string | null
  luoxueMusicSourceScripts: Array<{ id: string }>
}

function isValidLxPlaybackConfig(
  config: PlaybackResolverConfig
): config is LxPlaybackConfig {
  return (
    Array.isArray(config.musicSourceProviders) &&
    Array.isArray(config.luoxueMusicSourceScripts) &&
    (typeof config.activeLuoxueMusicSourceScriptId === 'string' ||
      config.activeLuoxueMusicSourceScriptId === null)
  )
}

export function createLxPlaybackProvider(): PlaybackSourceProvider {
  return {
    resolve: async options => {
      if (!isValidLxPlaybackConfig(options.config)) {
        return null
      }

      return resolveTrackWithLxMusicSource({
        track: options.track,
        quality: getQuality(options),
        config: options.config,
      })
    },
  }
}
