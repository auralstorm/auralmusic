import electron from 'electron'
import { readMusicApiBaseUrlFromEnv } from '../../shared/music-api-runtime.ts'

export type RuntimeApi = {
  /** 读取音乐 API 服务地址；可能为空，调用方需要走默认地址或禁用远端能力。 */
  getMusicApiBaseUrl: () => string | undefined
  /** 返回 Electron 当前运行平台，用于渲染层做极少量平台差异 UI。 */
  getPlatform: () => NodeJS.Platform
  /** 返回当前 CPU 架构，用于下载页或诊断信息展示。 */
  getArch: () => NodeJS.Architecture
  /** 返回应用版本号，优先使用注入值，其次使用 package 版本，最后兜底 1.0.0。 */
  getAppVersion: () => string
}

type RuntimeApiDependencies = {
  env?: NodeJS.ProcessEnv
  platform?: NodeJS.Platform
  arch?: NodeJS.Architecture
  appVersion?: string
}

/**
 * 创建运行时信息 API。
 *
 * 这些值在应用生命周期内基本稳定，使用同步 getter 可以避免 renderer 初始化时多一次 IPC 往返。
 */
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
  // 运行时信息只读暴露，不把 process/env 原对象交给 renderer。
  electron.contextBridge.exposeInMainWorld('appRuntime', createRuntimeApi())
}
