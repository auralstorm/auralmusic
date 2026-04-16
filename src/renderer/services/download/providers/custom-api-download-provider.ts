import type { DownloadResolverProvider } from './types.ts'

export function createCustomApiDownloadProvider(): DownloadResolverProvider {
  return {
    resolve: async () => {
      return null
    },
  }
}
