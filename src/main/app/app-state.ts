import type { BrowserWindow } from 'electron'

import type { StartedMusicApiRuntime } from '../server'

/**
 * 创建主进程运行态容器。
 *
 * Electron 主进程没有 React/Zustand 这类状态层，这里用闭包集中保存窗口、退出状态和
 * 内置 Music API 进程句柄，避免这些可变对象散落在 bootstrap 的多个事件回调里。
 */
export function createMainAppState() {
  // 主窗口引用需要跨托盘、生命周期、IPC 回调复用，窗口销毁后必须置空。
  let mainWindow: BrowserWindow | null = null
  // 区分“用户关闭窗口”和“应用真正退出”，用于决定关闭时隐藏到托盘还是放行退出。
  let isQuitting = false
  // 内置 Music API 运行时需要在退出前显式 dispose，避免子进程残留。
  let musicApiRuntime: StartedMusicApiRuntime | null = null

  return {
    getMainWindow() {
      return mainWindow
    },
    setMainWindow(window: BrowserWindow | null) {
      mainWindow = window
    },
    clearMainWindow() {
      mainWindow = null
    },
    getIsQuitting() {
      return isQuitting
    },
    setIsQuitting(nextIsQuitting: boolean) {
      isQuitting = nextIsQuitting
    },
    getMusicApiRuntime() {
      return musicApiRuntime
    },
    setMusicApiRuntime(runtime: StartedMusicApiRuntime | null) {
      musicApiRuntime = runtime
    },
    clearMusicApiRuntime() {
      musicApiRuntime = null
    },
  }
}

/** 主进程共享运行态类型，由 createMainAppState 推导，保证调用方和实现同步演进。 */
export type MainAppState = ReturnType<typeof createMainAppState>
