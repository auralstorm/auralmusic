export type LyricTextBundle = {
  lrc: string
  tlyric: string
  yrc: string
}

export function createLyricCacheKey(trackId: number | string) {
  return `lyrics:new:${trackId}`
}

export function readLyricField(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return ''
  }

  const lyric = (payload as Record<string, unknown>).lyric
  return typeof lyric === 'string' ? lyric : ''
}

export function readLyricTextBundle(payload: unknown): LyricTextBundle {
  if (!payload || typeof payload !== 'object') {
    return { lrc: '', tlyric: '', yrc: '' }
  }

  const record = payload as Record<string, unknown>
  const lrc = readLyricField(record.lrc)
  const tlyric = readLyricField(record.tlyric)
  const yrc = readLyricField(record.yrc)
  const nestedData = record.data

  if (nestedData && typeof nestedData === 'object') {
    const nested = readLyricTextBundle(nestedData)

    return {
      lrc: lrc || nested.lrc,
      tlyric: tlyric || nested.tlyric,
      yrc: yrc || nested.yrc,
    }
  }

  return { lrc, tlyric, yrc }
}

export function hasLyricTextBundle(bundle: LyricTextBundle) {
  return Boolean(bundle.lrc || bundle.tlyric || bundle.yrc)
}
