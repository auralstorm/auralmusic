import electron from 'electron'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { getConfig } from '../config/store.ts'
import {
  deleteLocalLibraryTrack,
  queryLocalLibraryAlbumsByInput,
  queryLocalLibraryArtistsByInput,
  queryLocalLibraryTracksByInput,
  readLocalLibraryOverview,
  readLocalLibrarySnapshot,
  resolveLocalLibraryOnlineLyricMatch,
  runLocalLibraryScan,
  syncLocalLibraryRoots,
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

      ipcMain.handle(LOCAL_LIBRARY_IPC_CHANNELS.SCAN, async () => {
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
            return null
          }

          return resolveLocalLibraryOnlineLyricMatch(input)
        }
      )
    },
  }
}

export function registerLocalLibraryIpc(
  options: LocalLibraryIpcRegistrationOptions = {}
) {
  createLocalLibraryIpc(options).register()
}
