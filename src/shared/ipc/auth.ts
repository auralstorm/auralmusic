/** 鉴权会话 IPC 通道，main/preload/renderer 三端必须共享同一组字符串。 */
export const AUTH_IPC_CHANNELS = {
  GET: 'auth:get',
  SET: 'auth:set',
  CLEAR: 'auth:clear',
} as const
