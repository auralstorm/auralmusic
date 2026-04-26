import type { BuiltinCoverProvider } from '../../platform-metadata.types.ts'

export const txBuiltinCoverProvider: BuiltinCoverProvider = {
  async getCover(track) {
    const currentCoverUrl = track.coverUrl.trim()
    if (currentCoverUrl) {
      return { coverUrl: currentCoverUrl }
    }

    const albumId =
      typeof track.lxInfo?.albumId === 'string' ||
      typeof track.lxInfo?.albumId === 'number'
        ? String(track.lxInfo.albumId).trim()
        : ''

    if (!albumId) {
      return null
    }

    return {
      coverUrl: `https://y.gtimg.cn/music/photo_new/T002R500x500M000${albumId}.jpg`,
    }
  },
}
