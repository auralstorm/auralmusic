import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc/index.ts'
import type {
  ImportedLxMusicSource,
  KwLyricDecodePayload,
  LxHttpRequestOptions,
  LxHttpRequestResponse,
  LxInitedData,
  LxMusicSourceScriptDraft,
} from '../../shared/lx-music-source'

export type MusicSourceApi = {
  /** 打开系统文件选择器选择 LX 音源脚本，并返回待导入草稿。 */
  selectLxScript: () => Promise<LxMusicSourceScriptDraft | null>
  /** 保存并注册 LX 音源脚本；initedData 用于保留脚本初始化后的元信息。 */
  saveLxScript: (
    draft: LxMusicSourceScriptDraft,
    initedData?: LxInitedData
  ) => Promise<ImportedLxMusicSource>
  /** 由主进程下载远程脚本，避免 renderer 直接处理跨域、证书和文件落盘细节。 */
  downloadLxScriptFromUrl: (url: string) => Promise<LxMusicSourceScriptDraft>
  /** 按音源 id 读取脚本文本，主要用于编辑器回显或调试查看。 */
  readLxScript: (id: string) => Promise<string | null>
  /** 删除已导入脚本及其持久化记录。 */
  removeLxScript: (id: string) => Promise<void>
  /** 代理 LX 脚本内的 HTTP 请求，统一由主进程处理网络能力和响应结构。 */
  lxHttpRequest: (
    url: string,
    options?: LxHttpRequestOptions
  ) => Promise<LxHttpRequestResponse>
  /** 解码酷我歌词响应，复用主进程中的兼容逻辑，避免 renderer 重复实现。 */
  decodeKwLyricResponse: (payload: KwLyricDecodePayload) => Promise<string>
}

const musicSourceApi: MusicSourceApi = {
  selectLxScript: async () => {
    return ipcRenderer.invoke(IPC_CHANNELS.MUSIC_SOURCE.SELECT_LX_SCRIPT)
  },
  saveLxScript: async (draft, initedData) => {
    return ipcRenderer.invoke(
      IPC_CHANNELS.MUSIC_SOURCE.SAVE_LX_SCRIPT,
      draft,
      initedData
    )
  },
  downloadLxScriptFromUrl: async url => {
    return ipcRenderer.invoke(IPC_CHANNELS.MUSIC_SOURCE.DOWNLOAD_LX_SCRIPT, url)
  },
  readLxScript: async id => {
    return ipcRenderer.invoke(IPC_CHANNELS.MUSIC_SOURCE.READ_LX_SCRIPT, id)
  },
  removeLxScript: async id => {
    return ipcRenderer.invoke(IPC_CHANNELS.MUSIC_SOURCE.REMOVE_LX_SCRIPT, id)
  },
  lxHttpRequest: async (url, options) => {
    // 音源脚本的网络访问集中到主进程，便于后续统一加代理、超时、日志和安全限制。
    return ipcRenderer.invoke(
      IPC_CHANNELS.MUSIC_SOURCE.LX_HTTP_REQUEST,
      url,
      options
    )
  },
  decodeKwLyricResponse: async payload => {
    return ipcRenderer.invoke(
      IPC_CHANNELS.MUSIC_SOURCE.DECODE_KW_LYRIC,
      payload
    )
  },
}

export function exposeMusicSourceApi() {
  // 仅暴露音源业务能力，renderer 不直接获得 Node 文件系统或任意网络执行入口。
  contextBridge.exposeInMainWorld('electronMusicSource', musicSourceApi)
}
