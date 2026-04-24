export const LOCAL_MEDIA_PROTOCOL = 'auralmusic-media'
const LOCAL_MEDIA_HOST = 'local-file'

export function createLocalMediaUrl(targetPath: string) {
  const trimmedPath = targetPath.trim()
  if (!trimmedPath) {
    return ''
  }

  const url = new URL(`${LOCAL_MEDIA_PROTOCOL}://${LOCAL_MEDIA_HOST}`)
  url.searchParams.set('path', trimmedPath)
  return url.toString()
}

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

export function isLocalMediaUrl(input: string | null | undefined) {
  if (!input?.trim()) {
    return false
  }

  return parseLocalMediaUrl(input) !== null
}
