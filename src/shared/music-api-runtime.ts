/** 内置 Music API 绑定到本地回环地址，避免监听外部网卡。 */
export const MUSIC_API_HOST = '127.0.0.1'
/** 主进程启动 Music API 后写入的 baseURL 环境变量名。 */
export const MUSIC_API_BASE_URL_ENV_KEY = 'AURAL_MUSIC_API_BASE_URL'
/** 主进程启动 Music API 后写入的端口环境变量名。 */
export const MUSIC_API_PORT_ENV_KEY = 'AURAL_MUSIC_API_PORT'

/** 根据端口生成 Music API baseURL，供主进程和 preload runtime 共享。 */
export function createMusicApiBaseUrl(
  port: number,
  host: string = MUSIC_API_HOST
) {
  return `http://${host}:${port}`
}

/** 从环境变量读取 Music API baseURL，未初始化时返回 undefined。 */
export function readMusicApiBaseUrlFromEnv(
  env: NodeJS.ProcessEnv = process.env
) {
  const baseURL = env[MUSIC_API_BASE_URL_ENV_KEY]?.trim()
  return baseURL || undefined
}
