import electron from 'electron'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { getConfig } from '../config/store.ts'
import {
  addLocalLibraryTrackToPlaylist,
  createLocalLibraryPlaylist,
  deleteLocalLibraryPlaylist,
  deleteLocalLibraryTrack,
  queryLocalLibraryPlaylistDetailByInput,
  queryLocalLibraryPlaylistsByInput,
  queryLocalLibraryAlbumsByInput,
  queryLocalLibraryArtistsByInput,
  queryLocalLibraryTracksByInput,
  readLocalLibraryOverview,
  readLocalLibrarySnapshot,
  resolveLocalLibraryOnlineLyricMatch,
  removeLocalLibraryTrackFromPlaylist,
  runLocalLibraryScan,
  syncLocalLibraryRoots,
  updateLocalLibraryPlaylist,
} from '../local-library/index.ts'
import { LOCAL_LIBRARY_IPC_CHANNELS } from '../../shared/ipc/index.ts'
import type { LocalLibraryOnlineLyricMatchInput } from '../../shared/local-library.ts'

type LocalLibraryIpcRegistrationOptions = {
  ipcMain?: {
    handle: (
      channel: string,
      handler: (...args: unknown[]) => unknown | Promise<unknown>
    ) => void
  }
  dialog?: {
    showOpenDialog: (
      window: unknown,
      options: {
        title: string
        defaultPath?: string
        properties: string[]
      }
    ) => Promise<{
      canceled: boolean
      filePaths: string[]
    }>
  }
  shell?: {
    openPath: (targetPath: string) => Promise<string>
    openExternal?: (targetPath: string) => Promise<string>
    showItemInFolder?: (fullPath: string) => void
  }
  browserWindowFromWebContents?: (webContents: unknown) => unknown
  platform?: NodeJS.Platform
}

/**
 * 创建本地曲库 IPC 注册器。
 *
 * 本地曲库操作横跨 SQLite、文件扫描、系统文件管理器和在线歌词匹配；renderer 只传入业务参数，
 * 主进程负责权限边界、平台兼容和配置开关。
 */
export function createLocalLibraryIpc(
  options: LocalLibraryIpcRegistrationOptions = {}
) {
  const ipcMain = options.ipcMain ?? electron.ipcMain
  const dialog = options.dialog ?? electron.dialog
  const shell = options.shell ?? electron.shell
  const platform = options.platform ?? process.platform
  const browserWindowFromWebContents =
    options.browserWindowFromWebContents ??
    ((webContents: unknown) =>
      electron.BrowserWindow.fromWebContents(
        webContents as Electron.WebContents
      ))

  return {
    register() {
      ipcMain.handle(LOCAL_LIBRARY_IPC_CHANNELS.GET_OVERVIEW, () => {
        return readLocalLibraryOverview()
      })

      ipcMain.handle(LOCAL_LIBRARY_IPC_CHANNELS.GET_SNAPSHOT, () => {
        return readLocalLibrarySnapshot()
      })

      ipcMain.handle(
        LOCAL_LIBRARY_IPC_CHANNELS.QUERY_TRACKS,
        (_event, input) => {
          return queryLocalLibraryTracksByInput(
            input as Parameters<typeof queryLocalLibraryTracksByInput>[0]
          )
        }
      )

      ipcMain.handle(
        LOCAL_LIBRARY_IPC_CHANNELS.QUERY_ALBUMS,
        (_event, input) => {
          return queryLocalLibraryAlbumsByInput(
            input as Parameters<typeof queryLocalLibraryAlbumsByInput>[0]
          )
        }
      )

      ipcMain.handle(
        LOCAL_LIBRARY_IPC_CHANNELS.QUERY_ARTISTS,
        (_event, input) => {
          return queryLocalLibraryArtistsByInput(
            input as Parameters<typeof queryLocalLibraryArtistsByInput>[0]
          )
        }
      )

      ipcMain.handle(
        LOCAL_LIBRARY_IPC_CHANNELS.QUERY_PLAYLISTS,
        (_event, input) => {
          return queryLocalLibraryPlaylistsByInput(
            input as Parameters<typeof queryLocalLibraryPlaylistsByInput>[0]
          )
        }
      )

      ipcMain.handle(
        LOCAL_LIBRARY_IPC_CHANNELS.GET_PLAYLIST_DETAIL,
        (_event, input) => {
          return queryLocalLibraryPlaylistDetailByInput(
            input as Parameters<
              typeof queryLocalLibraryPlaylistDetailByInput
            >[0]
          )
        }
      )

      ipcMain.handle(
        LOCAL_LIBRARY_IPC_CHANNELS.CREATE_PLAYLIST,
        (_event, input) => {
          return createLocalLibraryPlaylist(
            input as Parameters<typeof createLocalLibraryPlaylist>[0]
          )
        }
      )

      ipcMain.handle(
        LOCAL_LIBRARY_IPC_CHANNELS.UPDATE_PLAYLIST,
        (_event, input) => {
          return updateLocalLibraryPlaylist(
            input as Parameters<typeof updateLocalLibraryPlaylist>[0]
          )
        }
      )

      ipcMain.handle(
        LOCAL_LIBRARY_IPC_CHANNELS.DELETE_PLAYLIST,
        (_event, input) => {
          return deleteLocalLibraryPlaylist(
            input as Parameters<typeof deleteLocalLibraryPlaylist>[0]
          )
        }
      )

      ipcMain.handle(
        LOCAL_LIBRARY_IPC_CHANNELS.ADD_TRACK_TO_PLAYLIST,
        (_event, input) => {
          return addLocalLibraryTrackToPlaylist(
            input as Parameters<typeof addLocalLibraryTrackToPlaylist>[0]
          )
        }
      )

      ipcMain.handle(
        LOCAL_LIBRARY_IPC_CHANNELS.REMOVE_TRACK_FROM_PLAYLIST,
        (_event, input) => {
          return removeLocalLibraryTrackFromPlaylist(
            input as Parameters<typeof removeLocalLibraryTrackFromPlaylist>[0]
          )
        }
      )

      ipcMain.handle(LOCAL_LIBRARY_IPC_CHANNELS.SCAN, async () => {
        // 扫描总是读取最新配置，用户修改根目录或格式后无需重启主进程。
        return runLocalLibraryScan(
          getConfig('localLibraryRoots'),
          getConfig('localLibraryScanFormats')
        )
      })

      ipcMain.handle(
        LOCAL_LIBRARY_IPC_CHANNELS.SYNC_ROOTS,
        async (_event, roots: string[]) => {
          return syncLocalLibraryRoots(roots)
        }
      )

      ipcMain.handle(
        LOCAL_LIBRARY_IPC_CHANNELS.SELECT_DIRECTORIES,
        async event => {
          const window = browserWindowFromWebContents(
            (event as { sender: unknown }).sender
          )

          // 多选目录用于一次性配置多个曲库根目录，默认定位到当前第一个根目录。
          const result = await dialog.showOpenDialog(window, {
            title: 'Select Local Library Directories',
            defaultPath: getConfig('localLibraryRoots')[0],
            properties: [
              'openDirectory',
              'multiSelections',
              'createDirectory',
              'promptToCreate',
            ],
          })

          if (result.canceled) {
            return []
          }

          return result.filePaths
        }
      )

      ipcMain.handle(
        LOCAL_LIBRARY_IPC_CHANNELS.OPEN_DIRECTORY,
        async (_event, targetPath: string) => {
          if (!targetPath.trim()) {
            return false
          }

          const openResult = await shell.openPath(targetPath)
          if (!openResult) {
            return true
          }

          if (platform === 'win32' && shell.openExternal) {
            // Windows 下 openPath 对部分中文/特殊路径可能失败，file URL 是兼容兜底。
            const externalOpenResult = await shell.openExternal(
              pathToFileURL(targetPath).toString()
            )
            return !externalOpenResult
          }

          return false
        }
      )

      ipcMain.handle(
        LOCAL_LIBRARY_IPC_CHANNELS.REVEAL_TRACK,
        async (_event, filePath: string) => {
          if (!filePath.trim()) {
            return false
          }

          if (platform === 'win32' && shell.showItemInFolder) {
            // Windows 原生支持定位到文件本身，优先使用 showItemInFolder。
            shell.showItemInFolder(filePath)
            return true
          }

          const parentDirectory = path.dirname(filePath)
          if (!parentDirectory.trim()) {
            return false
          }

          const openResult = await shell.openPath(parentDirectory)
          if (!openResult) {
            return true
          }

          if (platform === 'win32' && shell.openExternal) {
            // 非 showItemInFolder 路径走父目录 file URL 兜底，减少路径编码问题。
            const externalOpenResult = await shell.openExternal(
              pathToFileURL(parentDirectory).toString()
            )
            return !externalOpenResult
          }

          return false
        }
      )

      ipcMain.handle(
        LOCAL_LIBRARY_IPC_CHANNELS.REMOVE_TRACK,
        async (_event, input) => {
          return deleteLocalLibraryTrack(
            input as Parameters<typeof deleteLocalLibraryTrack>[0]
          )
        }
      )

      ipcMain.handle(
        LOCAL_LIBRARY_IPC_CHANNELS.MATCH_ONLINE_LYRICS,
        async (_event, input: LocalLibraryOnlineLyricMatchInput) => {
          if (!getConfig('localLibraryOnlineLyricMatchEnabled')) {
            // 在线歌词匹配可能产生网络请求，必须严格受用户配置开关控制。
            return null
          }

          return resolveLocalLibraryOnlineLyricMatch(input)
        }
      )
    },
  }
}

/** 注册本地曲库 IPC 的生产入口。 */
export function registerLocalLibraryIpc(
  options: LocalLibraryIpcRegistrationOptions = {}
) {
  createLocalLibraryIpc(options).register()
}
