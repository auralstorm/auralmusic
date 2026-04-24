import electron from 'electron'
import { LOCAL_LIBRARY_IPC_CHANNELS } from '../../shared/ipc/index.ts'
import type {
  LocalLibraryAlbumQueryInput,
  LocalLibraryAlbumQueryResult,
  LocalLibraryArtistQueryInput,
  LocalLibraryArtistQueryResult,
  LocalLibraryOnlineLyricMatchInput,
  LocalLibraryOnlineLyricMatchResult,
  LocalLibraryOverviewSnapshot,
  LocalLibraryScanSummary,
  LocalLibraryRootRecord,
  LocalLibrarySnapshot,
  LocalLibraryTrackQueryInput,
  LocalLibraryTrackQueryResult,
  LocalLibraryTrackDeleteInput,
  LocalLibraryTrackDeleteResult,
} from '../../shared/local-library.ts'

export type LocalLibraryApi = {
  getOverview: () => Promise<LocalLibraryOverviewSnapshot>
  getSnapshot: () => Promise<LocalLibrarySnapshot>
  queryTracks: (
    input: LocalLibraryTrackQueryInput
  ) => Promise<LocalLibraryTrackQueryResult>
  queryAlbums: (
    input: LocalLibraryAlbumQueryInput
  ) => Promise<LocalLibraryAlbumQueryResult>
  queryArtists: (
    input: LocalLibraryArtistQueryInput
  ) => Promise<LocalLibraryArtistQueryResult>
  scan: () => Promise<LocalLibraryScanSummary>
  syncRoots: (roots: string[]) => Promise<LocalLibraryRootRecord[]>
  selectDirectories: () => Promise<string[]>
  openDirectory: (targetPath: string) => Promise<boolean>
  revealTrack: (filePath: string) => Promise<boolean>
  removeTrack: (
    input: LocalLibraryTrackDeleteInput
  ) => Promise<LocalLibraryTrackDeleteResult>
  matchOnlineLyrics: (
    input: LocalLibraryOnlineLyricMatchInput
  ) => Promise<LocalLibraryOnlineLyricMatchResult | null>
}

type LocalLibraryApiDependencies = {
  contextBridge?: {
    exposeInMainWorld: (key: string, value: unknown) => void
  }
  ipcRenderer?: {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  }
}

export function createLocalLibraryApi(
  dependencies: LocalLibraryApiDependencies = {}
) {
  const bridge = dependencies.contextBridge ?? electron.contextBridge
  const renderer = dependencies.ipcRenderer ?? electron.ipcRenderer

  const api: LocalLibraryApi = {
    getOverview: async () => {
      return renderer.invoke(
        LOCAL_LIBRARY_IPC_CHANNELS.GET_OVERVIEW
      ) as Promise<LocalLibraryOverviewSnapshot>
    },
    getSnapshot: async () => {
      return renderer.invoke(
        LOCAL_LIBRARY_IPC_CHANNELS.GET_SNAPSHOT
      ) as Promise<LocalLibrarySnapshot>
    },
    queryTracks: async input => {
      return renderer.invoke(
        LOCAL_LIBRARY_IPC_CHANNELS.QUERY_TRACKS,
        input
      ) as Promise<LocalLibraryTrackQueryResult>
    },
    queryAlbums: async input => {
      return renderer.invoke(
        LOCAL_LIBRARY_IPC_CHANNELS.QUERY_ALBUMS,
        input
      ) as Promise<LocalLibraryAlbumQueryResult>
    },
    queryArtists: async input => {
      return renderer.invoke(
        LOCAL_LIBRARY_IPC_CHANNELS.QUERY_ARTISTS,
        input
      ) as Promise<LocalLibraryArtistQueryResult>
    },
    scan: async () => {
      return renderer.invoke(
        LOCAL_LIBRARY_IPC_CHANNELS.SCAN
      ) as Promise<LocalLibraryScanSummary>
    },
    syncRoots: async roots => {
      return renderer.invoke(
        LOCAL_LIBRARY_IPC_CHANNELS.SYNC_ROOTS,
        roots
      ) as Promise<LocalLibraryRootRecord[]>
    },
    selectDirectories: async () => {
      return renderer.invoke(
        LOCAL_LIBRARY_IPC_CHANNELS.SELECT_DIRECTORIES
      ) as Promise<string[]>
    },
    openDirectory: async targetPath => {
      if (!targetPath.trim()) {
        return false
      }

      return renderer.invoke(
        LOCAL_LIBRARY_IPC_CHANNELS.OPEN_DIRECTORY,
        targetPath
      ) as Promise<boolean>
    },
    revealTrack: async filePath => {
      if (!filePath.trim()) {
        return false
      }

      return renderer.invoke(
        LOCAL_LIBRARY_IPC_CHANNELS.REVEAL_TRACK,
        filePath
      ) as Promise<boolean>
    },
    removeTrack: async input => {
      return renderer.invoke(
        LOCAL_LIBRARY_IPC_CHANNELS.REMOVE_TRACK,
        input
      ) as Promise<LocalLibraryTrackDeleteResult>
    },
    matchOnlineLyrics: async input => {
      return renderer.invoke(
        LOCAL_LIBRARY_IPC_CHANNELS.MATCH_ONLINE_LYRICS,
        input
      ) as Promise<LocalLibraryOnlineLyricMatchResult | null>
    },
  }

  return {
    api,
    expose() {
      bridge.exposeInMainWorld('electronLocalLibrary', api)
    },
  }
}

export function exposeLocalLibraryApi() {
  createLocalLibraryApi().expose()
}
