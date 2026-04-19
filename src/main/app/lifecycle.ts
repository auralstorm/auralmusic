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
    if (getMainWindow()) {
      showMainWindow()
      return
    }

    if (getWindowCount() === 0 && canCreateWindowOnActivate()) {
      createWindow()
    }
  })

  app.on('window-all-closed', () => {
    if (platform !== 'darwin' || shouldQuitOnWindowAllClosed()) {
      app.quit()
    }
  })

  app.on('before-quit', () => {
    setIsQuitting(true)
    disposeMusicApiRuntime()
    destroyTray()
  })

  app.on('will-quit', () => {
    clearConfiguredGlobalShortcuts()
  })
}
