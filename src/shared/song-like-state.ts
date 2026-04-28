/** 更新喜欢歌曲集合，返回新 Set 以保持 React/Zustand 状态不可变更新。 */
export function applySongLikeState(
  songIds: Set<number>,
  songId: number,
  nextLiked: boolean
) {
  const nextSongIds = new Set(songIds)

  if (!songId) {
    // 无效 id 不改变集合，避免接口异常时把 0 写入喜欢列表。
    return nextSongIds
  }

  if (nextLiked) {
    nextSongIds.add(songId)
  } else {
    nextSongIds.delete(songId)
  }

  return nextSongIds
}

/** 更新“喜欢/取消喜欢请求中”的集合，语义上复用同一套 Set 更新逻辑。 */
export function applySongLikePendingState(
  pendingSongIds: Set<number>,
  songId: number,
  pending: boolean
) {
  return applySongLikeState(pendingSongIds, songId, pending)
}
