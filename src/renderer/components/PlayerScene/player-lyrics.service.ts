import { getLyricNew } from '@/api/list'
import {
  createLyricCacheKey,
  hasLyricTextBundle,
  readLyricTextBundle,
  type LyricTextBundle,
} from './player-lyrics.data'

async function readCachedLyricPayload(cacheKey: string) {
  try {
    const cachedPayload = await window.electronCache.readLyricsPayload(cacheKey)
    if (!cachedPayload) {
      return null
    }

    const parsedPayload = JSON.parse(cachedPayload)
    return hasLyricTextBundle(readLyricTextBundle(parsedPayload))
      ? parsedPayload
      : null
  } catch (error) {
    console.error('read lyric cache failed', error)
    return null
  }
}

function writeLyricPayload(cacheKey: string, payload: unknown) {
  void window.electronCache
    .writeLyricsPayload(cacheKey, payload)
    .catch(error => {
      console.error('write lyric cache failed', error)
    })
}

export async function fetchLyricTextBundle(
  trackId: number | string
): Promise<LyricTextBundle> {
  const cacheKey = createLyricCacheKey(trackId)
  const cachedPayload = await readCachedLyricPayload(cacheKey)
  if (cachedPayload) {
    return readLyricTextBundle(cachedPayload)
  }

  const response = await getLyricNew({ id: trackId })
  writeLyricPayload(cacheKey, response.data)
  return readLyricTextBundle(response.data)
}
