import electron from 'electron'
import { readMusicApiBaseUrlFromEnv } from '../../shared/music-api-runtime.ts'

export type RuntimeApi = {
  getMusicApiBaseUrl: () => string | undefined
  getPlatform: () => NodeJS.Platform
  getArch: () => NodeJS.Architecture
  getAppVersion: () => string
}

type RuntimeApiDependencies = {
  env?: NodeJS.ProcessEnv
  platform?: NodeJS.Platform
  arch?: NodeJS.Architecture
  appVersion?: string
}

export function createRuntimeApi(
  dependencies: RuntimeApiDependencies = {}
): RuntimeApi {
  const env = dependencies.env ?? process.env
  const platform = dependencies.platform ?? process.platform
  const arch = dependencies.arch ?? process.arch
  const appVersion =
    dependencies.appVersion?.trim() || env.npm_package_version || '1.0.0'

  return {
    getMusicApiBaseUrl: () => readMusicApiBaseUrlFromEnv(env),
    getPlatform: () => platform,
    getArch: () => arch,
    getAppVersion: () => appVersion,
  }
}

export function exposeRuntimeApi() {
  electron.contextBridge.exposeInMainWorld('appRuntime', createRuntimeApi())
}
