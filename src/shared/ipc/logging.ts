/** 日志 IPC 通道，renderer 只能通过这些受控入口写日志或打开日志目录。 */
export const LOGGING_IPC_CHANNELS = {
  WRITE: 'logging:write',
  GET_FILE_PATH: 'logging:get-file-path',
  OPEN_DIRECTORY: 'logging:open-directory',
} as const
