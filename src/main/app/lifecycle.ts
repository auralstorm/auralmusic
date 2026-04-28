import type { BrowserWindow } from 'electron'

type MainLifecycleApp = {
  on: (event: string, handler: () => void) => void
  quit: () => void
}

type RegisterMainAppLifecycleOptions = {
  app: MainLifecycleApp
  platform: NodeJS.Platform
  getMainWindow: () => BrowserWindow | null
  getWindowCount: () => number
  showMainWindow: () => void
  createWindow: () => void
  canCreateWindowOnActivate?: () => boolean
  shouldQuitOnWindowAllClosed?: () => boolean
  setIsQuitting: (isQuitting: boolean) => void
  disposeMusicApiRuntime: () => void
  destroyTray: () => void
  clearConfiguredGlobalShortcuts: () => void
}

/**
 * 注册 Electron 应用生命周期事件。
 *
 * 生命周期回调统一集中在这里，可以保证窗口恢复、托盘销毁、子进程释放和全局快捷键注销
 * 按固定顺序发生，避免散落注册导致退出路径难以追踪。
 */
export function registerMainAppLifecycle({
  app,
  platform,
  getMainWindow,
  getWindowCount,
  showMainWindow,
  createWindow,
  canCreateWindowOnActivate = () => true,
  shouldQuitOnWindowAllClosed = () => false,
  setIsQuitting,
  disposeMusicApiRuntime,
  destroyTray,
  clearConfiguredGlobalShortcuts,
}: RegisterMainAppLifecycleOptions) {
  app.on('activate', () => {
    // macOS 点击 Dock 图标时应优先恢复现有窗口，没有窗口才按启动状态创建。
    if (getMainWindow()) {
      showMainWindow()
      return
    }

    if (getWindowCount() === 0 && canCreateWindowOnActivate()) {
      createWindow()
    }
  })

  app.on('window-all-closed', () => {
    // macOS 默认保留应用进程；其它平台根据关闭行为配置决定是否退出。
    if (platform !== 'darwin' || shouldQuitOnWindowAllClosed()) {
      app.quit()
    }
  })

  app.on('before-quit', () => {
    // before-quit 阶段释放外部资源，确保子进程和托盘不会在主进程退出后残留。
    setIsQuitting(true)
    disposeMusicApiRuntime()
    destroyTray()
  })

  app.on('will-quit', () => {
    // Electron 要求全局快捷键在退出前注销，否则下一次启动可能注册失败。
    clearConfiguredGlobalShortcuts()
  })
}
