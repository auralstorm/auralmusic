import type { AppConfig } from '../../../../shared/config.ts'
import { normalizeSongUrlMatchResponse } from '../../../../shared/playback.ts'
import { DEFAULT_BUILTIN_UNBLOCK_MATCH_SOURCES } from '../../music-source/providers/builtin-unblock-playback-provider.ts'
import {
  getDefaultSongUrlMatch,
  inferFileExtensionFromUrl,
  loadDefaultSongApiListModule,
} from './shared.ts'
import type {
  DownloadResolverProvider,
  DownloadSourceProviderOptions,
} from '@/types/core'

export function createBuiltinUnblockDownloadProvider(): DownloadResolverProvider {
  return {
    resolve: async (options: DownloadSourceProviderOptions) => {
      const loadSongApiListModule =
        options.deps.loadSongApiListModule ?? loadDefaultSongApiListModule
      const getSongUrlMatch =
        options.deps.getSongUrlMatch ??
        (await getDefaultSongUrlMatch(loadSongApiListModule))
      const configuredModules = (options.config as Partial<AppConfig>)
        .enhancedSourceModules
      const configuredMatchSources = Array.isArray(configuredModules)
        ? configuredModules
        : DEFAULT_BUILTIN_UNBLOCK_MATCH_SOURCES

      for (const source of configuredMatchSources) {
        try {
          const matchResponse = await getSongUrlMatch({
            id: options.track.id,
            source,
          })
          const playback = normalizeSongUrlMatchResponse(matchResponse.data, {
            id: options.track.id,
            time: options.track.duration,
            br: 0,
          })

          if (!playback?.url) {
            continue
          }

          return {
            url: playback.url,
            quality: options.quality,
            provider: 'builtin-unblock',
            fileExtension: inferFileExtensionFromUrl(playback.url),
          }
        } catch {
          continue
        }
      }

      return null
    },
  }
}
