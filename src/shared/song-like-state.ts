export function applySongLikeState(
  songIds: Set<number>,
  songId: number,
  nextLiked: boolean
) {
  const nextSongIds = new Set(songIds)

  if (!songId) {
    return nextSongIds
  }

  if (nextLiked) {
    nextSongIds.add(songId)
  } else {
    nextSongIds.delete(songId)
  }

  return nextSongIds
}

export function applySongLikePendingState(
  pendingSongIds: Set<number>,
  songId: number,
  pending: boolean
) {
  return applySongLikeState(pendingSongIds, songId, pending)
}
