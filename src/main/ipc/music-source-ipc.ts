import electron from 'electron'
import { IPC_CHANNELS } from '../config/types'
import {
  downloadLxMusicSourceScriptFromUrl,
  readLxMusicSourceScript,
  removeLxMusicSourceScript,
  saveLxMusicSourceScript,
  selectLxMusicSourceScript,
} from '../music-source/lx-script-store'
import type { LxInitedData } from '../../shared/lx-music-source'
import type { LxMusicSourceScriptDraft } from '../../shared/lx-music-source'

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
    async (_event, url: string, options: RequestInit = {}) => {
      const response = await fetch(url, options)
      const rawBody = await response.text()
      let body: unknown = rawBody

      try {
        body = JSON.parse(rawBody)
      } catch {
        // keep raw response text
      }

      return {
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body,
      }
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
