import type { RuntimeApi } from '@preload/api/runtime-api'
import type { UpdateApi } from '@preload/api/update-api'
import type { WindowApi } from '@preload/api/window-api'
import type { InternalAxiosRequestConfig } from 'axios'

export interface ResolveRequestBaseUrlOptions {
  runtimeBaseUrl?: string
  viteApiBaseUrl?: string
}

export interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  retryCount?: number
  noRetry?: boolean
}

export interface ElectronRuntimeWindow {
  appRuntime?: RuntimeApi
  electronUpdate?: UpdateApi
  electronWindow?: WindowApi
}

export type SinkIdMediaElement = HTMLMediaElement & {
  setSinkId?: (sinkId: string) => Promise<void>
}
