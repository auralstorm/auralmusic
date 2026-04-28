/** 本地曲库实体类型，页面 tab、路由和查询入口共用。 */
export const LOCAL_LIBRARY_ENTITY_TYPES = [
  'songs',
  'albums',
  'artists',
  'playlists',
] as const

export type LocalLibraryEntityType = (typeof LOCAL_LIBRARY_ENTITY_TYPES)[number]

/** 本地曲库歌曲记录，coverPath 是主进程本地路径，coverUrl 是 renderer 可访问 URL。 */
export interface LocalLibraryTrackRecord {
  id: number
  rootId: number
  filePath: string
  fileName: string
  title: string
  artistName: string
  albumName: string
  durationMs: number
  lyricText: string
  translatedLyricText: string
  coverPath: string | null
  coverUrl: string
  fileSize: number
  mtimeMs: number
  audioFormat: string
  trackNo: number | null
  discNo: number | null
}

/** 本地专辑聚合记录。 */
export interface LocalLibraryAlbumRecord {
  id: number
  name: string
  artistName: string
  trackCount: number
  coverUrl: string
}

/** 本地歌手聚合记录。 */
export interface LocalLibraryArtistRecord {
  id: number
  name: string
  trackCount: number
  coverUrl: string
}

/** 本地歌单记录，containsTrack 用于收藏到歌单弹窗标记当前歌曲是否已存在。 */
export interface LocalLibraryPlaylistRecord {
  id: number
  name: string
  trackCount: number
  coverUrl: string
  createdAt: number
  updatedAt: number
  containsTrack?: boolean
}

/** 本地歌单列表查询参数。 */
export interface LocalLibraryPlaylistQueryInput {
  keyword: string
  trackFilePath?: string | null
  offset: number
  limit: number
}

export interface LocalLibraryPlaylistQueryResult {
  items: LocalLibraryPlaylistRecord[]
  total: number
  offset: number
  limit: number
}

export interface LocalLibraryPlaylistDetailQueryInput {
  playlistId: number
  keyword: string
  offset: number
  limit: number
}

export interface LocalLibraryPlaylistDetailQueryResult {
  playlist: LocalLibraryPlaylistRecord | null
  items: LocalLibraryTrackRecord[]
  total: number
  offset: number
  limit: number
}

/** 创建本地歌单参数。 */
export interface LocalLibraryPlaylistCreateInput {
  name: string
}

export interface LocalLibraryPlaylistCreateResult {
  status: 'created' | 'duplicate'
  playlist: LocalLibraryPlaylistRecord | null
}

export interface LocalLibraryPlaylistUpdateInput {
  playlistId: number
  name: string
}

export interface LocalLibraryPlaylistUpdateResult {
  status: 'updated' | 'duplicate' | 'not-found'
  playlist: LocalLibraryPlaylistRecord | null
}

/** 删除本地歌单参数。 */
export interface LocalLibraryPlaylistDeleteInput {
  playlistId: number
}

export interface LocalLibraryPlaylistDeleteResult {
  deleted: boolean
}

export interface LocalLibraryPlaylistTrackMutationInput {
  playlistId: number
  filePath: string
}

export interface LocalLibraryPlaylistTrackMutationResult {
  status: 'ok' | 'duplicate' | 'not-found'
}

/** 本地曲库根目录记录。 */
export interface LocalLibraryRootRecord {
  id: number
  path: string
  createdAt: number
}

/** 在线歌词匹配输入，必须包含足够信息做保守匹配。 */
export interface LocalLibraryOnlineLyricMatchInput {
  filePath: string
  title: string
  artistName: string
  albumName: string
  durationMs: number
  coverUrl: string
}

/** 在线匹配写回后的歌词和封面结果。 */
export interface LocalLibraryOnlineLyricMatchResult {
  lyricText: string
  translatedLyricText: string
  coverUrl: string
}

/** library-only 只删索引，permanent 同时删除音频和同名歌词文件。 */
export type LocalLibraryTrackDeleteMode = 'library-only' | 'permanent'

export interface LocalLibraryTrackDeleteInput {
  filePath: string
  mode: LocalLibraryTrackDeleteMode
}

export interface LocalLibraryTrackDeleteResult {
  removed: boolean
}

export interface LocalLibraryStats {
  rootCount: number
  trackCount: number
  albumCount: number
  artistCount: number
  lastScannedAt: number | null
}

/** 首页/侧边栏使用的轻量曲库概览。 */
export interface LocalLibraryOverviewSnapshot {
  roots: LocalLibraryRootRecord[]
  stats: LocalLibraryStats
}

/** 本地曲库完整快照，用于页面初始化。 */
export interface LocalLibrarySnapshot {
  roots: LocalLibraryRootRecord[]
  stats: LocalLibraryStats
  tracks: LocalLibraryTrackRecord[]
  albums: LocalLibraryAlbumRecord[]
  artists: LocalLibraryArtistRecord[]
  playlists: LocalLibraryPlaylistRecord[]
}

/** 本地歌曲查询参数，scope 用于从专辑/歌手详情页复用同一查询。 */
export interface LocalLibraryTrackQueryInput {
  keyword: string
  scopeType: 'all' | 'album' | 'artist'
  scopeValue: string | null
  scopeArtistName: string | null
  offset: number
  limit: number
}

export interface LocalLibraryTrackQueryResult {
  items: LocalLibraryTrackRecord[]
  total: number
  offset: number
  limit: number
}

export interface LocalLibraryAlbumQueryInput {
  keyword: string
  offset: number
  limit: number
}

export interface LocalLibraryAlbumQueryResult {
  items: LocalLibraryAlbumRecord[]
  total: number
  offset: number
  limit: number
}

export interface LocalLibraryArtistQueryInput {
  keyword: string
  offset: number
  limit: number
}

export interface LocalLibraryArtistQueryResult {
  items: LocalLibraryArtistRecord[]
  total: number
  offset: number
  limit: number
}

/** 本地曲库扫描结果摘要。 */
export interface LocalLibraryScanSummary {
  rootCount: number
  importedCount: number
  skippedCount: number
  lastScannedAt: number
}
