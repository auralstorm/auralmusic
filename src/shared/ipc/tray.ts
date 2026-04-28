/** 托盘 IPC 通道，renderer 同步托盘状态，main 反向发送托盘命令。 */
export const TRAY_IPC_CHANNELS = {
  SYNC_STATE: 'tray:sync-state',
  COMMAND: 'tray:command',
} as const
