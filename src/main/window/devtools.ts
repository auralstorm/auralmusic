type ToggleableDevToolsWebContents = {
  isDevToolsOpened: () => boolean
  closeDevTools: () => void
  openDevTools: (options: { mode: 'detach'; activate: boolean }) => void
}

/**
 * 切换分离模式 DevTools。
 *
 * 主窗口布局较紧凑，开发时使用 detach 模式可以避免 DevTools 改变 renderer 可视区域。
 */
export function toggleDetachedDevTools(
  webContents: ToggleableDevToolsWebContents
) {
  if (webContents.isDevToolsOpened()) {
    webContents.closeDevTools()
    return
  }

  webContents.openDevTools({
    mode: 'detach',
    activate: true,
  })
}
