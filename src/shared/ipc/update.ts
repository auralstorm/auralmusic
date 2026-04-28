/** 自动更新 IPC 通道，所有更新状态机操作都通过 UpdateService 转发。 */
export const UPDATE_IPC_CHANNELS = {
  GET_SNAPSHOT: 'update:get-snapshot',
  CHECK_FOR_UPDATES: 'update:check-for-updates',
  START_UPDATE: 'update:start-update',
  RESTART_AND_INSTALL: 'update:restart-and-install',
  OPEN_DOWNLOAD_PAGE: 'update:open-download-page',
  STATE_CHANGED: 'update:state-changed',
} as const
