import type { LocalLibraryAlbumRecord } from '../../../shared/local-library.ts'

export function buildLocalLibraryAlbumMetaItems(
  album: Pick<LocalLibraryAlbumRecord, 'trackCount' | 'artistName'>
) {
  return [album.artistName, `${album.trackCount} 首歌曲`]
}
