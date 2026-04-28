/** 窗口控制 IPC 通道，renderer 自绘标题栏和关闭确认逻辑依赖这组契约。 */
export const WINDOW_IPC_CHANNELS = {
  MINIMIZE: 'window:minimize',
  TOGGLE_MAXIMIZE: 'window:toggle-maximize',
  CLOSE: 'window:close',
  QUIT_APP: 'window:quit-app',
  HIDE_TO_TRAY: 'window:hide-to-tray',
  SHOW: 'window:show',
  CLOSE_REQUESTED: 'window:close-requested',
  IS_MAXIMIZED: 'window:is-maximized',
  MAXIMIZE_CHANGED: 'window:maximize-changed',
  TOGGLE_FULLSCREEN: 'window:toggle-fullscreen',
  IS_FULLSCREEN: 'window:is-fullscreen',
  FULLSCREEN_CHANGED: 'window:fullscreen-changed',
} as const
