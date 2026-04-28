/** 歌曲列表项最小身份字段，过滤工具只关心 id。 */
export interface SongIdentity {
  id: number
}

/** 过滤被本地隐藏的歌曲，通常用于取消喜欢后立即从列表消失。 */
export function filterVisibleSongItems<T extends SongIdentity>(
  songs: T[],
  hiddenSongIds: Set<number>
) {
  if (hiddenSongIds.size === 0) {
    return songs
  }

  return songs.filter(song => !hiddenSongIds.has(song.id))
}

/** 喜欢列表加载完成后，只保留仍在喜欢集合内且未被隐藏的歌曲。 */
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
