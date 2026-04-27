import electron from 'electron'
import { IPC_CHANNELS } from '../config/types'
import {
  downloadLxMusicSourceScriptFromUrl,
  readLxMusicSourceScript,
  removeLxMusicSourceScript,
  saveLxMusicSourceScript,
  selectLxMusicSourceScript,
} from '../music-source/lx-script-store'
import type {
  LxHttpRequestOptions,
  LxInitedData,
  LxMusicSourceScriptDraft,
} from '../../shared/lx-music-source'
import {
  requestLxHttpWithElectronNet,
  requestLxHttpWithNode,
} from '../music-source/lx-http-request'
import {
  decodeKwLyricResponse,
  type KwLyricDecodePayload,
} from '../music-source/kw-lyric-decode'

const { ipcMain } = electron

export function registerMusicSourceIpc() {
  ipcMain.handle(IPC_CHANNELS.MUSIC_SOURCE.SELECT_LX_SCRIPT, event => {
    return selectLxMusicSourceScript(
      electron.BrowserWindow.fromWebContents(event.sender)
    )
  })

  ipcMain.handle(
    IPC_CHANNELS.MUSIC_SOURCE.SAVE_LX_SCRIPT,
    (_event, draft: LxMusicSourceScriptDraft, initedData?: LxInitedData) => {
      return saveLxMusicSourceScript(draft, initedData)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.MUSIC_SOURCE.DOWNLOAD_LX_SCRIPT,
    (_event, url: string) => {
      return downloadLxMusicSourceScriptFromUrl(url)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.MUSIC_SOURCE.LX_HTTP_REQUEST,
    async (_event, url: string, options: LxHttpRequestOptions = {}) => {
      try {
        return await requestLxHttpWithElectronNet(electron.net, url, options)
      } catch (error) {
        console.warn(
          '[MusicSourceIPC] electron.net LX request failed, trying node http fallback',
          error
        )
        return requestLxHttpWithNode(url, options)
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.MUSIC_SOURCE.DECODE_KW_LYRIC,
    (_event, payload: KwLyricDecodePayload) => {
      return decodeKwLyricResponse(payload)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.MUSIC_SOURCE.READ_LX_SCRIPT,
    (_event, id: string) => {
      return readLxMusicSourceScript(id)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.MUSIC_SOURCE.REMOVE_LX_SCRIPT,
    (_event, id: string) => {
      return removeLxMusicSourceScript(id)
    }
  )
}
