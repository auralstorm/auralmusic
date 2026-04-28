import {
  MUSIC_API_BASE_URL_ENV_KEY,
  MUSIC_API_PORT_ENV_KEY,
} from '../shared/music-api-runtime.ts'

export {
  createMusicApiBaseUrl,
  MUSIC_API_BASE_URL_ENV_KEY,
  MUSIC_API_HOST,
  MUSIC_API_PORT_ENV_KEY,
  readMusicApiBaseUrlFromEnv,
} from '../shared/music-api-runtime.ts'

export interface MusicApiRuntimeInfo {
  port: number
  baseURL: string
}

/**
 * 将运行中的 Music API 地址写入进程环境。
 *
 * 主进程、preload runtime API 和请求工具共享这份环境值，避免多处重复推导端口。
 */
export function applyMusicApiRuntimeEnv(runtimeInfo: MusicApiRuntimeInfo) {
  process.env[MUSIC_API_BASE_URL_ENV_KEY] = runtimeInfo.baseURL
  process.env[MUSIC_API_PORT_ENV_KEY] = String(runtimeInfo.port)
}
