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
  selectLxScript: () => Promise<LxMusicSourceScriptDraft | null>
  saveLxScript: (
    draft: LxMusicSourceScriptDraft,
    initedData?: LxInitedData
  ) => Promise<ImportedLxMusicSource>
  downloadLxScriptFromUrl: (url: string) => Promise<LxMusicSourceScriptDraft>
  readLxScript: (id: string) => Promise<string | null>
  removeLxScript: (id: string) => Promise<void>
  lxHttpRequest: (
    url: string,
    options?: LxHttpRequestOptions
  ) => Promise<LxHttpRequestResponse>
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
  contextBridge.exposeInMainWorld('electronMusicSource', musicSourceApi)
}
