/** 快捷键 IPC 通道，动作广播走独立 channel，状态查询和注册结果变更走这里。 */
export const SHORTCUT_IPC_CHANNELS = {
  GET_GLOBAL_REGISTRATION_STATUSES: 'shortcut:get-global-registration-statuses',
  GLOBAL_REGISTRATION_STATUSES_CHANGED:
    'shortcut:global-registration-statuses-changed',
} as const
