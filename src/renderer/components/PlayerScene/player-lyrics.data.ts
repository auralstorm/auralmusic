import type { LyricTextBundle } from './types'

export function createLyricCacheKey(trackId: number | string, sourceId = 'wy') {
  return `lyrics:${sourceId}:${trackId}`
}

export function readLyricField(payload: unknown) {
  if (typeof payload === 'string') {
    return payload
  }

  if (!payload || typeof payload !== 'object') {
    return ''
  }

  const lyric = (payload as Record<string, unknown>).lyric
  return typeof lyric === 'string' ? lyric : ''
}

export function readLyricTextBundle(payload: unknown): LyricTextBundle {
  if (typeof payload === 'string') {
    return { lrc: payload, tlyric: '', yrc: '' }
  }

  if (!payload || typeof payload !== 'object') {
    return { lrc: '', tlyric: '', yrc: '' }
  }

  const record = payload as Record<string, unknown>
  const lrc = readLyricField(record.lrc) || readLyricField(record.lyric)
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
