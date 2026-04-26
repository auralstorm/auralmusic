import type { LxHttpRequestOptions } from '../../../../../shared/lx-music-source.ts'
import type { BuiltinCoverProvider } from '../../platform-metadata.types.ts'

type RequestJsonFn = (
  url: string,
  options?: LxHttpRequestOptions
) => Promise<unknown>

type KgBuiltinCoverProviderDeps = {
  requestJson?: RequestJsonFn
}

function readText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function normalizeKgImage(value: unknown, imgSize?: unknown) {
  const image = readText(value)
  if (!image) {
    return ''
  }

  const size = Array.isArray(imgSize) ? readText(imgSize[0]) : ''
  return size ? image.replace('{size}', size) : image
}

async function requestKgCoverJson(
  url: string,
  options: LxHttpRequestOptions = {}
) {
  const response = await window.electronMusicSource.lxHttpRequest(url, {
    timeout: 15000,
    ...options,
  })

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`HTTP ${response.statusCode}`)
  }

  return response.body
}

export function createKgBuiltinCoverProvider(
  deps: KgBuiltinCoverProviderDeps = {}
): BuiltinCoverProvider {
  const requestJson = deps.requestJson ?? requestKgCoverJson

  return {
    async getCover(track) {
      const currentCoverUrl = readText(track.coverUrl)
      if (currentCoverUrl) {
        return { coverUrl: currentCoverUrl }
      }

      const hash = readText(track.lxInfo?.hash)
      const songmid =
        typeof track.lxInfo?.songmid === 'string' ||
        typeof track.lxInfo?.songmid === 'number'
          ? String(track.lxInfo.songmid).trim()
          : ''
      const albumId =
        typeof track.lxInfo?.albumId === 'string' ||
        typeof track.lxInfo?.albumId === 'number'
          ? String(track.lxInfo.albumId).trim()
          : ''

      if (!hash || !songmid) {
        return null
      }

      const payload = await requestJson(
        'http://media.store.kugou.com/v1/get_res_privilege',
        {
          method: 'POST',
          headers: {
            'KG-RC': '1',
            'KG-THash': 'expand_search_manager.cpp:852736169:451',
            'User-Agent': 'KuGou2012-9020-ExpandSearchManager',
          },
          body: JSON.stringify({
            appid: 1001,
            area_code: '1',
            behavior: 'play',
            clientver: '9020',
            need_hash_offset: 1,
            relate: 1,
            resource: [
              {
                album_audio_id: songmid,
                album_id: albumId,
                hash,
                id: 0,
                name: `${track.artistNames} - ${track.name}.mp3`,
                type: 'audio',
              },
            ],
            token: '',
            userid: 2626431536,
            vip: 1,
          }),
        }
      )

      const info =
        payload &&
        typeof payload === 'object' &&
        Array.isArray((payload as { data?: Array<{ info?: unknown }> }).data)
          ? (payload as { data: Array<{ info?: unknown }> }).data[0]?.info
          : undefined

      const coverUrl =
        info && typeof info === 'object'
          ? normalizeKgImage(
              (info as { image?: unknown }).image,
              (info as { imgsize?: unknown }).imgsize
            )
          : ''

      return coverUrl ? { coverUrl } : null
    },
  }
}

export const kgBuiltinCoverProvider = createKgBuiltinCoverProvider()
