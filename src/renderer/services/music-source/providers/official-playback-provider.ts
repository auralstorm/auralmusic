import type { AudioQualityLevel } from '../../../../main/config/types.ts'
import { normalizeSongUrlV1Response } from '../../../../shared/playback.ts'
import { getSongUrlV1 as defaultGetSongUrlV1 } from '../../../api/list.ts'
import type {
  PlaybackSourceProvider,
  PlaybackSourceProviderOptions,
} from '../playback-source-resolver.ts'

type GetSongUrlV1 = typeof defaultGetSongUrlV1

function getQuality(options: PlaybackSourceProviderOptions): AudioQualityLevel {
  return options.context.config.quality ?? 'higher'
}

export function createOfficialPlaybackProvider(
  getSongUrlV1: GetSongUrlV1 = defaultGetSongUrlV1
): PlaybackSourceProvider {
  return {
    resolve: async options => {
      try {
        const response = await getSongUrlV1({
          id: options.track.id,
          level: getQuality(options),
          unblock: false,
        })

        return normalizeSongUrlV1Response(response.data)
      } catch {
        return null
      }
    },
  }
}
