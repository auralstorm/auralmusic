import type { LxHttpRequestOptions } from '../../../../shared/lx-music-source.ts'

export async function requestBuiltinSearchJson(
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
  console.log(`requestBuiltinSearchJson:${url}`, options, response)

  return response.body
}
