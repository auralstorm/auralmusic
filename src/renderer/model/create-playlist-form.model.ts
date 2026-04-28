import type { CreatePlaylistFormPayload } from '@/types/core'

// 歌单名称长度限制与创建歌单表单保持一致，避免提交后才由接口拒绝。
export const CREATE_PLAYLIST_TITLE_MAX_LENGTH = 40

/**
 * 构建创建歌单接口 payload
 * @param title 用户输入的歌单名称
 * @param isPrivate 是否创建隐私歌单
 * @returns 合法时返回接口 payload，不合法时返回 null
 *
 * 这里集中处理 trim、空标题和长度限制，让表单组件只关心展示状态。
 * 网易云创建隐私歌单使用字符串 `"10"`，公开歌单则不传 privacy。
 */
export function buildCreatePlaylistPayload(
  title: string,
  isPrivate: boolean
): CreatePlaylistFormPayload | null {
  const normalizedTitle = title.trim()

  if (
    !normalizedTitle ||
    normalizedTitle.length > CREATE_PLAYLIST_TITLE_MAX_LENGTH
  ) {
    return null
  }

  return {
    name: normalizedTitle,
    privacy: isPrivate ? '10' : undefined,
  }
}
