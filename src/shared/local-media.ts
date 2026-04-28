/** 自定义本地媒体协议名，替代 file:// 暴露本机绝对路径。 */
export const LOCAL_MEDIA_PROTOCOL = 'auralmusic-media'
const LOCAL_MEDIA_HOST = 'local-file'

/** 将本地文件路径包装成 local-media URL，renderer 只消费 URL，不直接拼协议。 */
export function createLocalMediaUrl(targetPath: string) {
  const trimmedPath = targetPath.trim()
  if (!trimmedPath) {
    return ''
  }

  const url = new URL(`${LOCAL_MEDIA_PROTOCOL}://${LOCAL_MEDIA_HOST}`)
  url.searchParams.set('path', trimmedPath)
  return url.toString()
}

/** 从 local-media URL 中解析原始文件路径，非法协议/host 返回 null。 */
export function parseLocalMediaUrl(input: string) {
  try {
    const url = new URL(input)
    if (
      url.protocol !== `${LOCAL_MEDIA_PROTOCOL}:` ||
      url.hostname !== LOCAL_MEDIA_HOST
    ) {
      return null
    }

    const targetPath = url.searchParams.get('path')?.trim()
    return targetPath || null
  } catch {
    return null
  }
}

/** 判断字符串是否是应用生成的 local-media URL。 */
export function isLocalMediaUrl(input: string | null | undefined) {
  if (!input?.trim()) {
    return false
  }

  return parseLocalMediaUrl(input) !== null
}
