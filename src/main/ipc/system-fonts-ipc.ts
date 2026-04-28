import electron from 'electron'

import { SYSTEM_FONTS_IPC_CHANNELS } from '../../shared/ipc/index.ts'

type FontListOptions = {
  disableQuoting: boolean
}

type SystemFontsIpcRegistrationOptions = {
  ipcMain?: {
    handle: (
      channel: string,
      handler: (...args: unknown[]) => unknown | Promise<unknown>
    ) => void
  }
  getFonts?: (options?: FontListOptions) => Promise<string[]>
}

/** 字体列表去重、去空并按中文环境排序，保证设置页展示稳定。 */
function normalizeFontFamilies(fonts: string[]) {
  return Array.from(
    new Set(
      fonts
        .map(font => font.trim())
        .filter((font): font is string => Boolean(font))
    )
  ).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
}

/** 动态导入 font-list，避免在模块加载阶段就触发原生依赖初始化。 */
async function getSystemFonts(options?: FontListOptions) {
  const { getFonts } = await import('font-list')
  return getFonts(options)
}

/**
 * 创建系统字体 IPC 注册器。
 *
 * 支持注入 getFonts/ipcMain，方便测试字体归一化和通道注册，不依赖真实系统字体环境。
 */
export function createSystemFontsIpc(
  options: SystemFontsIpcRegistrationOptions = {}
) {
  const ipcMain = options.ipcMain ?? electron.ipcMain
  const getFonts = options.getFonts ?? getSystemFonts

  return {
    register() {
      ipcMain.handle(SYSTEM_FONTS_IPC_CHANNELS.GET_ALL, async () => {
        const fonts = await getFonts({ disableQuoting: true })
        return normalizeFontFamilies(fonts)
      })
    },
  }
}

/** 注册系统字体 IPC 的生产入口。 */
export function registerSystemFontsIpc(
  options: SystemFontsIpcRegistrationOptions = {}
) {
  createSystemFontsIpc(options).register()
}
