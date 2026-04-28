export function formatArtistNames(
  artists: Array<string | null | undefined> | string | null | undefined,
  separator = ' / '
) {
  if (typeof artists === 'string') {
    return artists.trim() || '未知歌手'
  }

  const names = (artists || []).filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0
  )

  return names.length ? names.join(separator) : '未知歌手'
}

export function formatDurationMs(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }

  return value > 1000 ? Math.floor(value) : Math.floor(value * 1000)
}

export function formatDurationSeconds(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.floor(value * 1000))
}

export function parseIntegerId(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value)
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export function ensureCoverUrl(value: unknown) {
  if (typeof value !== 'string') {
    return ''
  }

  const coverUrl = value.trim()
  if (!coverUrl) {
    return ''
  }

  if (/^https?:\/\//i.test(coverUrl)) {
    return coverUrl
  }

  if (coverUrl.startsWith('//')) {
    return `https:${coverUrl}`
  }

  if (coverUrl.startsWith('/data/oss/')) {
    return `https://d.musicapp.migu.cn${coverUrl}`
  }

  return coverUrl
}

export function hasPositiveNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) && parsed > 0
  }

  return false
}

export function resolveQualityLabel(options: {
  has24bit?: boolean
  hasSq?: boolean
  hasHq?: boolean
}) {
  if (options.has24bit) {
    return '24bit'
  }

  if (options.hasSq) {
    return 'SQ'
  }

  if (options.hasHq) {
    return 'HQ'
  }

  return ''
}

export function resolveQualityLabelFromText(value: unknown) {
  const text = typeof value === 'string' ? value.toLowerCase() : ''
  return resolveQualityLabel({
    has24bit: /24|hi-?res|hires|master/.test(text),
    hasSq: /sq|lossless|flac|无损/.test(text),
    hasHq: /hq|320/.test(text),
  })
}
