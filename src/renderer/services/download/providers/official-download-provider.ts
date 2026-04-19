import { normalizeSongUrlV1Response } from '../../../../shared/playback.ts'
import {
  getDefaultSongDownloadUrlV1,
  getDefaultSongUrlV1,
  inferFileExtensionFromUrl,
  loadDefaultSongApiListModule,
  readOfficialDownloadUrl,
} from './shared.ts'
import type {
  DownloadResolverProvider,
  DownloadSourceProviderOptions,
} from '@/types/core'

export function createOfficialDownloadProvider(): DownloadResolverProvider {
  return {
    resolve: async (options: DownloadSourceProviderOptions) => {
      const loadSongApiListModule =
        options.deps.loadSongApiListModule ?? loadDefaultSongApiListModule
      const getSongUrl =
        options.deps.getSongUrlV1 ??
        (await getDefaultSongUrlV1(loadSongApiListModule))

      try {
        const playbackResponse = await getSongUrl({
          id: options.track.id,
          level: options.quality,
          unblock: false,
        })
        const playback = normalizeSongUrlV1Response(playbackResponse.data)

        if (playback?.url) {
          return {
            url: playback.url,
            quality: options.quality,
            provider: 'official-playback',
            fileExtension: inferFileExtensionFromUrl(playback.url),
          }
        }
      } catch {
        // Fall through to the next resolver.
      }

      const getSongDownloadUrl =
        options.deps.getSongDownloadUrlV1 ??
        (await getDefaultSongDownloadUrlV1(loadSongApiListModule))

      try {
        const downloadResponse = await getSongDownloadUrl({
          id: options.track.id,
          level: options.quality,
        })
        const officialDownload = readOfficialDownloadUrl(downloadResponse.data)

        if (officialDownload) {
          return {
            url: officialDownload.url,
            quality: options.quality,
            provider: 'official-download',
            fileExtension: officialDownload.fileExtension,
          }
        }
      } catch {
        // Fall through to the next resolver.
      }

      return null
    },
  }
}
