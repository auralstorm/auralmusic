/** 通用 IPC 通道集合：配置读写和 LX 音源脚本能力都从这里复用。 */
export const IPC_CHANNELS = {
  CONFIG: {
    GET: 'config:get',
    SET: 'config:set',
    RESET: 'config:reset',
  },
  MUSIC_SOURCE: {
    SELECT_LX_SCRIPT: 'music-source:select-lx-script',
    SAVE_LX_SCRIPT: 'music-source:save-lx-script',
    READ_LX_SCRIPT: 'music-source:read-lx-script',
    REMOVE_LX_SCRIPT: 'music-source:remove-lx-script',
    DOWNLOAD_LX_SCRIPT: 'music-source:download-lx-script',
    LX_HTTP_REQUEST: 'music-source:lx-http-request',
    DECODE_KW_LYRIC: 'music-source:decode-kw-lyric',
  },
} as const
