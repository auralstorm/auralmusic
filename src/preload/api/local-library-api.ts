import electron from 'electron'
import { LOCAL_LIBRARY_IPC_CHANNELS } from '../../shared/ipc/index.ts'
import type {
  LocalLibraryAlbumQueryInput,
  LocalLibraryAlbumQueryResult,
  LocalLibraryArtistQueryInput,
  LocalLibraryArtistQueryResult,
  LocalLibraryPlaylistCreateInput,
  LocalLibraryPlaylistCreateResult,
  LocalLibraryPlaylistDeleteInput,
  LocalLibraryPlaylistDeleteResult,
  LocalLibraryPlaylistDetailQueryInput,
  LocalLibraryPlaylistDetailQueryResult,
  LocalLibraryPlaylistQueryInput,
  LocalLibraryPlaylistQueryResult,
  LocalLibraryPlaylistTrackMutationInput,
  LocalLibraryPlaylistTrackMutationResult,
  LocalLibraryPlaylistUpdateInput,
  LocalLibraryPlaylistUpdateResult,
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
  queryPlaylists: (
    input: LocalLibraryPlaylistQueryInput
  ) => Promise<LocalLibraryPlaylistQueryResult>
  getPlaylistDetail: (
    input: LocalLibraryPlaylistDetailQueryInput
  ) => Promise<LocalLibraryPlaylistDetailQueryResult>
  createPlaylist: (
    input: LocalLibraryPlaylistCreateInput
  ) => Promise<LocalLibraryPlaylistCreateResult>
  updatePlaylist: (
    input: LocalLibraryPlaylistUpdateInput
  ) => Promise<LocalLibraryPlaylistUpdateResult>
  deletePlaylist: (
    input: LocalLibraryPlaylistDeleteInput
  ) => Promise<LocalLibraryPlaylistDeleteResult>
  addTrackToPlaylist: (
    input: LocalLibraryPlaylistTrackMutationInput
  ) => Promise<LocalLibraryPlaylistTrackMutationResult>
  removeTrackFromPlaylist: (
    input: LocalLibraryPlaylistTrackMutationInput
  ) => Promise<LocalLibraryPlaylistTrackMutationResult>
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
    queryPlaylists: async input => {
      return renderer.invoke(
        LOCAL_LIBRARY_IPC_CHANNELS.QUERY_PLAYLISTS,
        input
      ) as Promise<LocalLibraryPlaylistQueryResult>
    },
    getPlaylistDetail: async input => {
      return renderer.invoke(
        LOCAL_LIBRARY_IPC_CHANNELS.GET_PLAYLIST_DETAIL,
        input
      ) as Promise<LocalLibraryPlaylistDetailQueryResult>
    },
    createPlaylist: async input => {
      return renderer.invoke(
        LOCAL_LIBRARY_IPC_CHANNELS.CREATE_PLAYLIST,
        input
      ) as Promise<LocalLibraryPlaylistCreateResult>
    },
    updatePlaylist: async input => {
      return renderer.invoke(
        LOCAL_LIBRARY_IPC_CHANNELS.UPDATE_PLAYLIST,
        input
      ) as Promise<LocalLibraryPlaylistUpdateResult>
    },
    deletePlaylist: async input => {
      return renderer.invoke(
        LOCAL_LIBRARY_IPC_CHANNELS.DELETE_PLAYLIST,
        input
      ) as Promise<LocalLibraryPlaylistDeleteResult>
    },
    addTrackToPlaylist: async input => {
      return renderer.invoke(
        LOCAL_LIBRARY_IPC_CHANNELS.ADD_TRACK_TO_PLAYLIST,
        input
      ) as Promise<LocalLibraryPlaylistTrackMutationResult>
    },
    removeTrackFromPlaylist: async input => {
      return renderer.invoke(
        LOCAL_LIBRARY_IPC_CHANNELS.REMOVE_TRACK_FROM_PLAYLIST,
        input
      ) as Promise<LocalLibraryPlaylistTrackMutationResult>
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
