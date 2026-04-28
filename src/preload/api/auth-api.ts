import { contextBridge, ipcRenderer } from 'electron'
import { AUTH_IPC_CHANNELS } from '../../shared/ipc/index.ts'
import type { AuthSession } from '../../shared/auth'

export type AuthApi = {
  /** 读取当前登录会话；未登录或会话已清理时返回 null。 */
  getAuthSession: () => Promise<AuthSession | null>
  /** 写入登录会话，并返回主进程规范化后的会话数据。 */
  setAuthSession: (authSession: AuthSession) => Promise<AuthSession>
  /** 清除本地登录会话。 */
  clearAuthSession: () => Promise<void>
}

const authApi: AuthApi = {
  getAuthSession: async () => {
    return ipcRenderer.invoke(AUTH_IPC_CHANNELS.GET)
  },
  setAuthSession: async authSession => {
    return ipcRenderer.invoke(AUTH_IPC_CHANNELS.SET, authSession)
  },
  clearAuthSession: async () => {
    return ipcRenderer.invoke(AUTH_IPC_CHANNELS.CLEAR)
  },
}

export function exposeAuthApi() {
  // 鉴权数据通过主进程持久化，renderer 不直接访问本地存储文件。
  contextBridge.exposeInMainWorld('electronAuth', authApi)
}
