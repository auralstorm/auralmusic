import type {
  CollectPlaylistTarget,
  RawPlaylistItem,
  RawResponse,
} from '@/types/core'

/**
 * 递归剥离接口响应中的 data 包装
 *
 * 收藏歌单相关接口在不同调用路径下可能返回 `res.data` 或 `res.data.data`。
 * model 层先把响应剥成业务体，组件层就不需要关心接口包装差异。
 */
function unwrapData<T>(response?: RawResponse<T> | null): T | undefined {
  if (!response) {
    return undefined
  }

  if (response.data && typeof response.data === 'object') {
    return unwrapData(response.data as RawResponse<T>)
  }

  return response as T
}

/**
 * 归一化“收藏到歌单”抽屉可选目标
 * @param response 用户歌单接口原始响应
 * @param currentUserId 当前登录用户 id，用于识别“我喜欢的音乐”
 * @returns 仅包含可收藏目标的歌单列表
 *
 * 过滤规则：
 * - 保留自己创建的普通歌单
 * - 保留当前用户自己的“我喜欢的音乐”歌单
 * - 过滤订阅歌单，避免向不可编辑歌单添加歌曲
 */
export function normalizeCollectPlaylistTargets(
  response: unknown,
  currentUserId?: number | null
): CollectPlaylistTarget[] {
  const body = unwrapData(response as RawResponse<unknown>)

  if (!body || typeof body !== 'object') {
    return []
  }

  const playlists = (body as { playlist?: RawPlaylistItem[] }).playlist

  if (!Array.isArray(playlists)) {
    return []
  }

  return playlists.flatMap(playlist => {
    if (!playlist?.id) {
      return []
    }

    // “我喜欢的音乐” specialType 为 5，必须确认 creator 是当前用户，避免误收别人主页里的同类歌单。
    const isLikedPlaylist =
      playlist.specialType === 5 && playlist.creator?.userId === currentUserId
    // subscribed=true 表示订阅歌单，不能作为添加歌曲目标。
    const isCreatedPlaylist =
      playlist.subscribed !== true && playlist.specialType !== 5

    if (!isLikedPlaylist && !isCreatedPlaylist) {
      return []
    }

    return [
      {
        id: playlist.id,
        name: playlist.name?.trim() || '未知歌单',
        coverImgUrl: playlist.coverImgUrl || playlist.picUrl || '',
        trackCount: playlist.trackCount || 0,
        specialType: playlist.specialType || 0,
        editable: isLikedPlaylist || isCreatedPlaylist,
        isLikedPlaylist,
      },
    ]
  })
}

/**
 * 插入或更新一个收藏目标
 * @param current 当前目标列表
 * @param next 新创建或更新后的目标
 * @returns 将 next 放到列表首位且按 id 去重后的列表
 */
export function insertCollectPlaylistTarget(
  current: CollectPlaylistTarget[],
  next: CollectPlaylistTarget
): CollectPlaylistTarget[] {
  return [next, ...current.filter(item => item.id !== next.id)]
}

/**
 * 从刷新后的歌单列表中定位刚创建的歌单
 * @param previous 创建前的歌单列表
 * @param next 创建后重新拉取的歌单列表
 * @param createdName 用户提交的歌单名称
 * @returns 优先返回新增 id 的同名歌单，找不到时回退到同名歌单
 *
 * 部分接口创建歌单后不会直接返回完整歌单对象，因此需要通过“前后列表差异”
 * 找到新歌单，随后才能继续执行“创建后立即收藏歌曲”的流程。
 */
export function findCreatedCollectPlaylistTarget(
  previous: CollectPlaylistTarget[],
  next: CollectPlaylistTarget[],
  createdName: string
): CollectPlaylistTarget | null {
  const normalizedName = createdName.trim()
  const previousIds = new Set(previous.map(item => item.id))

  const insertedMatch =
    next.find(
      item => !previousIds.has(item.id) && item.name.trim() === normalizedName
    ) || null

  if (insertedMatch) {
    return insertedMatch
  }

  return next.find(item => item.name.trim() === normalizedName) || null
}

/**
 * 判断歌曲是否已在歌单曲目 id 列表中
 * @param songId 待检查歌曲 id
 * @param trackIds 歌单内歌曲 id 列表
 */
export function isSongInPlaylistTrackIds(
  songId: number,
  trackIds: number[]
): boolean {
  return trackIds.includes(songId)
}
