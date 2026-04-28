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
  /** 获取本地曲库概览统计，适合首页或侧边栏快速展示。 */
  getOverview: () => Promise<LocalLibraryOverviewSnapshot>
  /** 获取曲库完整快照，通常用于初始化本地音乐页面的基础状态。 */
  getSnapshot: () => Promise<LocalLibrarySnapshot>
  /** 按分页、排序、关键字等条件查询本地歌曲。 */
  queryTracks: (
    input: LocalLibraryTrackQueryInput
  ) => Promise<LocalLibraryTrackQueryResult>
  /** 查询本地专辑聚合结果。 */
  queryAlbums: (
    input: LocalLibraryAlbumQueryInput
  ) => Promise<LocalLibraryAlbumQueryResult>
  /** 查询本地歌手聚合结果。 */
  queryArtists: (
    input: LocalLibraryArtistQueryInput
  ) => Promise<LocalLibraryArtistQueryResult>
  /** 查询用户创建或扫描得到的本地歌单列表。 */
  queryPlaylists: (
    input: LocalLibraryPlaylistQueryInput
  ) => Promise<LocalLibraryPlaylistQueryResult>
  /** 获取歌单详情及其歌曲分页结果。 */
  getPlaylistDetail: (
    input: LocalLibraryPlaylistDetailQueryInput
  ) => Promise<LocalLibraryPlaylistDetailQueryResult>
  /** 创建本地歌单。 */
  createPlaylist: (
    input: LocalLibraryPlaylistCreateInput
  ) => Promise<LocalLibraryPlaylistCreateResult>
  /** 更新本地歌单名称、排序等元信息。 */
  updatePlaylist: (
    input: LocalLibraryPlaylistUpdateInput
  ) => Promise<LocalLibraryPlaylistUpdateResult>
  /** 删除本地歌单；是否影响歌曲文件由主进程业务规则决定。 */
  deletePlaylist: (
    input: LocalLibraryPlaylistDeleteInput
  ) => Promise<LocalLibraryPlaylistDeleteResult>
  /** 将歌曲加入本地歌单。 */
  addTrackToPlaylist: (
    input: LocalLibraryPlaylistTrackMutationInput
  ) => Promise<LocalLibraryPlaylistTrackMutationResult>
  /** 从本地歌单移除歌曲。 */
  removeTrackFromPlaylist: (
    input: LocalLibraryPlaylistTrackMutationInput
  ) => Promise<LocalLibraryPlaylistTrackMutationResult>
  /** 扫描已配置根目录，解析音频文件并更新本地曲库索引。 */
  scan: () => Promise<LocalLibraryScanSummary>
  /** 同步曲库根目录配置，主进程负责校验和持久化。 */
  syncRoots: (roots: string[]) => Promise<LocalLibraryRootRecord[]>
  /** 打开系统目录选择器，返回用户选择的曲库根目录集合。 */
  selectDirectories: () => Promise<string[]>
  /** 使用系统文件管理器打开指定目录；空路径会在 preload 层直接短路。 */
  openDirectory: (targetPath: string) => Promise<boolean>
  /** 在系统文件管理器中定位指定歌曲文件；空路径会在 preload 层直接短路。 */
  revealTrack: (filePath: string) => Promise<boolean>
  /** 从本地曲库移除歌曲记录，必要时由主进程处理文件删除策略。 */
  removeTrack: (
    input: LocalLibraryTrackDeleteInput
  ) => Promise<LocalLibraryTrackDeleteResult>
  /** 尝试为本地歌曲匹配在线歌词，返回 null 表示没有可靠匹配。 */
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

/**
 * 创建本地曲库桥接 API。
 *
 * 本地曲库涉及文件扫描、数据库和系统文件管理器操作，所有重能力都留在主进程；
 * preload 只做受控 IPC 转发，确保 renderer 不能直接访问用户文件系统。
 */
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
      // 空路径不交给主进程处理，避免误触发打开默认位置或出现平台差异行为。
      if (!targetPath.trim()) {
        return false
      }

      return renderer.invoke(
        LOCAL_LIBRARY_IPC_CHANNELS.OPEN_DIRECTORY,
        targetPath
      ) as Promise<boolean>
    },
    revealTrack: async filePath => {
      // 文件定位必须有明确目标，空字符串直接返回 false 让 UI 能稳定降级。
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
      // window.electronLocalLibrary 是 renderer 访问本地曲库能力的唯一入口。
      bridge.exposeInMainWorld('electronLocalLibrary', api)
    },
  }
}

export function exposeLocalLibraryApi() {
  createLocalLibraryApi().expose()
}
