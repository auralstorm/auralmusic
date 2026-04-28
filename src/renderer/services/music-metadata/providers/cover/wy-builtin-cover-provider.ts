import type { BuiltinCoverProvider } from '../../platform-metadata.types.ts'

export const wyBuiltinCoverProvider: BuiltinCoverProvider = {
  async getCover(track) {
    const coverUrl = track.coverUrl.trim()
    return coverUrl ? { coverUrl } : null
  },
}
