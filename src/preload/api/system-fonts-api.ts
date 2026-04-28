import electron from 'electron'

import { SYSTEM_FONTS_IPC_CHANNELS } from '../../shared/ipc/index.ts'

export type SystemFontsApi = {
  /** 获取系统可用字体名称列表，用于字体选择器和配置回显。 */
  getAll: () => Promise<string[]>
}

type SystemFontsApiDependencies = {
  contextBridge?: {
    exposeInMainWorld: (key: string, value: unknown) => void
  }
  ipcRenderer?: {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  }
}

/**
 * 创建系统字体桥接 API。
 *
 * 字体枚举依赖主进程能力，preload 只返回字符串列表，避免 renderer 获得文件系统访问权限。
 */
export function createSystemFontsApi(
  dependencies: SystemFontsApiDependencies = {}
) {
  const bridge = dependencies.contextBridge ?? electron.contextBridge
  const renderer = dependencies.ipcRenderer ?? electron.ipcRenderer

  const api: SystemFontsApi = {
    getAll: async () => {
      return renderer.invoke(SYSTEM_FONTS_IPC_CHANNELS.GET_ALL) as Promise<
        string[]
      >
    },
  }

  return {
    api,
    expose() {
      // 暴露只读查询能力，renderer 不能通过该入口修改系统字体或访问字体文件路径。
      bridge.exposeInMainWorld('electronSystemFonts', api)
    },
  }
}

export function exposeSystemFontsApi() {
  createSystemFontsApi().expose()
}
