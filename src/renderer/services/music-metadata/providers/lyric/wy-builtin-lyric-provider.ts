import type {
  BuiltinLyricProvider,
  BuiltinLyricResult,
  PlatformMetadataRequest,
} from '../../platform-metadata.types.ts'

type GetLyricNewResponse = {
  data?: unknown
}

type GetLyricNewFn = (
  params: Pick<PlatformMetadataRequest, 'id'>
) => Promise<GetLyricNewResponse>

type WyBuiltinLyricProviderDeps = {
  getLyricNew?: GetLyricNewFn
}

function readLyricText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function normalizeWyLyricPayload(payload: unknown): BuiltinLyricResult | null {
  const root =
    payload && typeof payload === 'object'
      ? (payload as {
          lrc?: { lyric?: unknown }
          tlyric?: { lyric?: unknown }
          yrc?: { lyric?: unknown }
        })
      : undefined

  const lyric = readLyricText(root?.lrc?.lyric)
  if (!lyric) {
    return null
  }

  const translatedLyric = readLyricText(root?.tlyric?.lyric)
  const yrc = readLyricText(root?.yrc?.lyric)

  return {
    lyric,
    ...(translatedLyric ? { translatedLyric } : {}),
    ...(yrc ? { yrc } : {}),
  }
}

async function requestWyLyric(params: Pick<PlatformMetadataRequest, 'id'>) {
  const api = await import('../../../../api/list.ts')
  return api.getLyricNew(params)
}

/**
 * 创建网易云内置歌词 provider，默认走 renderer API 的 `getLyricNew`。
 */
export function createWyBuiltinLyricProvider(
  deps: WyBuiltinLyricProviderDeps = {}
): BuiltinLyricProvider {
  const getLyricNew = deps.getLyricNew ?? requestWyLyric

  return {
    async getLyric(track) {
      const response = await getLyricNew({ id: track.id })
      return normalizeWyLyricPayload(response?.data)
    },
  }
}

export const wyBuiltinLyricProvider = createWyBuiltinLyricProvider()

export { normalizeWyLyricPayload }
