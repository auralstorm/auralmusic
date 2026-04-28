import type { PlaybackTrack } from '../../../../shared/playback.ts'
import type { LibrarySongItem } from '../types'

export function buildLibraryQuickSongPlaybackQueue(
  songs: LibrarySongItem[]
): PlaybackTrack[] {
  return songs.map(song => ({
    id: song.id,
    name: song.name,
    artistNames: song.artistNames,
    albumName: song.albumName,
    coverUrl: song.coverUrl,
    duration: song.duration,
    fee: typeof song.fee === 'number' ? song.fee : 0,
  }))
}

export function filterLibraryQuickSongs(
  songs: LibrarySongItem[],
  hiddenSongIds: Set<number>
) {
  return songs.filter(song => !hiddenSongIds.has(song.id)).slice(0, 9)
}
