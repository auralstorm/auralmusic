import { resolveTrackWithLxMusicSource } from '../../music-source/lx-playback-resolver.ts'
import { inferFileExtensionFromUrl } from './shared.ts'
import type {
  DownloadResolverConfig,
  DownloadResolverProvider,
  DownloadSourceProviderOptions,
} from './types.ts'

type LxDownloadConfig = DownloadResolverConfig & {
  activeLuoxueMusicSourceScriptId: string | null
  luoxueMusicSourceScripts: Array<{ id: string }>
}

function isValidLxDownloadConfig(
  config: DownloadResolverConfig
): config is LxDownloadConfig {
  return (
    Array.isArray(config.musicSourceProviders) &&
    Array.isArray(config.luoxueMusicSourceScripts) &&
    (typeof config.activeLuoxueMusicSourceScriptId === 'string' ||
      config.activeLuoxueMusicSourceScriptId === null)
  )
}

export function createLxDownloadProvider(): DownloadResolverProvider {
  return {
    resolve: async (options: DownloadSourceProviderOptions) => {
      if (!isValidLxDownloadConfig(options.config)) {
        return null
      }

      const resolver =
        options.deps.resolveTrackWithLxMusicSource ??
        resolveTrackWithLxMusicSource

      const result = await resolver({
        track: options.track,
        quality: options.quality,
        config: options.config,
      })

      if (!result?.url) {
        return null
      }

      return {
        url: result.url,
        quality: options.quality,
        provider: 'lxMusic',
        fileExtension: inferFileExtensionFromUrl(result.url),
      }
    },
  }
}
