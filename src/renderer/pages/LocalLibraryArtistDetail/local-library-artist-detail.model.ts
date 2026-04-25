import type { LocalLibraryArtistRecord } from '../../../shared/local-library.ts'

export function buildLocalLibraryArtistMetaItems(
  artist: Pick<LocalLibraryArtistRecord, 'trackCount'>
) {
  return [`${artist.trackCount} 首歌曲`]
}
