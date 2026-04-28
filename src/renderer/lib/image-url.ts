export const imageSizes = {
  avatar: { width: 80, height: 80 },
  listCover: { width: 50, height: 50 },
  cardCover: { width: 210, height: 210 },
  detailCover: { width: 220, height: 220 },
  mvCard: { width: 208, height: 136 },
  playerCover: { width: 512, height: 512 },
  backgroundCover: { width: 300, height: 200 },
} as const

function normalizeDimension(value: number | undefined) {
  if (!Number.isFinite(value) || !value || value <= 0) {
    return null
  }

  return Math.round(value)
}

function supportsNeteaseImageParam(url: URL) {
  return (
    url.hostname === 'music.126.net' || url.hostname.endsWith('.music.126.net')
  )
}

export function resizeImageUrl(
  imageUrl: string | null | undefined,
  width?: number,
  height?: number
) {
  if (!imageUrl) {
    return ''
  }

  // 有些接口会返回直接返回预览，再拼接尺寸会报错
  if (imageUrl.includes('thumbnail')) {
    return imageUrl
  }

  const normalizedWidth = normalizeDimension(width)
  const normalizedHeight = normalizeDimension(height ?? width)

  if (!normalizedWidth || !normalizedHeight) {
    return imageUrl
  }

  try {
    const url = new URL(imageUrl)

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return imageUrl
    }

    if (!supportsNeteaseImageParam(url)) {
      return imageUrl
    }

    url.searchParams.set('param', `${normalizedWidth}y${normalizedHeight}`)

    return url.toString()
  } catch {
    return imageUrl
  }
}
