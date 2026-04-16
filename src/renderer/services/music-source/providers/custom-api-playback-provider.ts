import type { PlaybackSourceProvider } from '../playback-source-resolver.ts'

export function createCustomApiPlaybackProvider(): PlaybackSourceProvider {
  return {
    resolve: async () => {
      return null
    },
  }
}
