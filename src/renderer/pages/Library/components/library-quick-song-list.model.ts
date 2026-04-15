import type { PlaybackTrack } from '../../../../shared/playback.ts'
import type { LibrarySongItem } from '../library.model'

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
  }))
}

export function filterLibraryQuickSongs(
  songs: LibrarySongItem[],
  hiddenSongIds: Set<number>
) {
  return songs.filter(song => !hiddenSongIds.has(song.id)).slice(0, 9)
}
