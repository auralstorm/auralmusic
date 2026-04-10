export interface SongIdentity {
  id: number
}

export function filterVisibleSongItems<T extends SongIdentity>(
  songs: T[],
  hiddenSongIds: Set<number>
) {
  if (hiddenSongIds.size === 0) {
    return songs
  }

  return songs.filter(song => !hiddenSongIds.has(song.id))
}

export function filterLikedSongsListItems<T extends SongIdentity>(
  songs: T[],
  likedSongIds: Set<number>,
  likedSongsLoaded: boolean,
  hiddenSongIds: Set<number>
) {
  const visibleSongs = filterVisibleSongItems(songs, hiddenSongIds)

  if (!likedSongsLoaded) {
    return visibleSongs
  }

  return visibleSongs.filter(song => likedSongIds.has(song.id))
}
