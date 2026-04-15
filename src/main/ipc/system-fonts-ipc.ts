import electron from 'electron'

import { SYSTEM_FONTS_IPC_CHANNELS } from '../../shared/ipc/system-fonts.ts'

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

function normalizeFontFamilies(fonts: string[]) {
  return Array.from(
    new Set(
      fonts
        .map(font => font.trim())
        .filter((font): font is string => Boolean(font))
    )
  ).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
}

async function getSystemFonts(options?: FontListOptions) {
  const { getFonts } = await import('font-list')
  return getFonts(options)
}

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

export function registerSystemFontsIpc(
  options: SystemFontsIpcRegistrationOptions = {}
) {
  createSystemFontsIpc(options).register()
}
