import { normalizeSongUrlV1Response } from '../../../../shared/playback.ts'
import {
  getDefaultSongUrlV1,
  inferFileExtensionFromUrl,
  loadDefaultSongApiListModule,
} from './shared.ts'
import type {
  DownloadResolverProvider,
  DownloadSourceProviderOptions,
} from './types.ts'

export function createBuiltinUnblockDownloadProvider(): DownloadResolverProvider {
  return {
    resolve: async (options: DownloadSourceProviderOptions) => {
      if (!options.policy.builtinPlatforms.length) {
        return null
      }

      const loadSongApiListModule =
        options.deps.loadSongApiListModule ?? loadDefaultSongApiListModule
      const getSongUrl =
        options.deps.getSongUrlV1 ??
        (await getDefaultSongUrlV1(loadSongApiListModule))

      try {
        const playbackResponse = await getSongUrl({
          id: options.track.id,
          level: options.quality,
          unblock: true,
        })
        const playback = normalizeSongUrlV1Response(playbackResponse.data)

        if (playback?.url) {
          return {
            url: playback.url,
            quality: options.quality,
            provider: 'builtin-unblock',
            fileExtension: inferFileExtensionFromUrl(playback.url),
          }
        }
      } catch {
        return null
      }

      return null
    },
  }
}
