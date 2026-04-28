import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc/index.ts'
import type { AppConfig } from '../../shared/config.ts'

export type ConfigApi = {
  /** 按配置键读取值，泛型保证返回类型和 AppConfig 中的字段类型一致。 */
  getConfig: <K extends keyof AppConfig>(key: K) => Promise<AppConfig[K]>
  /** 写入单个配置项，主进程负责持久化和必要校验。 */
  setConfig: <K extends keyof AppConfig>(
    key: K,
    value: AppConfig[K]
  ) => Promise<void>
  /** 重置全部配置到默认值。 */
  resetConfig: () => Promise<void>
}

const configApi: ConfigApi = {
  getConfig: async key => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONFIG.GET, key)
  },
  setConfig: async (key, value) => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONFIG.SET, key, value)
  },
  resetConfig: async () => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONFIG.RESET)
  },
}

export function exposeConfigApi() {
  // 配置读写统一穿过主进程，renderer 不直接接触配置文件路径和存储实现。
  contextBridge.exposeInMainWorld('electronConfig', configApi)
}
