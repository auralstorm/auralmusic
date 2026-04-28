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
import { createMainLogger } from '../logging/logger'
import { readLogUrlHost } from '../../shared/logging'

const { ipcMain } = electron
const musicSourceLogger = createMainLogger('lx-source')

/**
 * 注册 LX 音源相关 IPC。
 *
 * 音源脚本涉及文件选择、远程下载、脚本存储和跨域请求代理，全部放在主进程执行；
 * renderer 只拿到受控结果，不能直接访问 Node 文件系统或任意网络能力。
 */
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
        // electron.net 复用 Chromium 网络栈，优先获得和 Electron 应用一致的代理/证书行为。
        return await requestLxHttpWithElectronNet(electron.net, url, options)
      } catch (error) {
        musicSourceLogger.debug(
          'electron.net LX request failed, trying node http fallback',
          { error, sourceHost: readLogUrlHost(url), sourceUrl: url }
        )
        // 部分音源站点对 electron.net 兼容性较差，失败时回退到 Node http/https。
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
