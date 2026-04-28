import Database from 'better-sqlite3'

import { createLocalMediaUrl } from '../../shared/local-media.ts'
import type {
  LocalLibraryAlbumRecord,
  LocalLibraryAlbumQueryInput,
  LocalLibraryAlbumQueryResult,
  LocalLibraryArtistRecord,
  LocalLibraryArtistQueryInput,
  LocalLibraryArtistQueryResult,
  LocalLibraryOverviewSnapshot,
  LocalLibraryPlaylistCreateInput,
  LocalLibraryPlaylistCreateResult,
  LocalLibraryPlaylistDeleteInput,
  LocalLibraryPlaylistDeleteResult,
  LocalLibraryPlaylistDetailQueryInput,
  LocalLibraryPlaylistDetailQueryResult,
  LocalLibraryPlaylistQueryInput,
  LocalLibraryPlaylistQueryResult,
  LocalLibraryPlaylistRecord,
  LocalLibraryPlaylistTrackMutationInput,
  LocalLibraryPlaylistTrackMutationResult,
  LocalLibraryPlaylistUpdateInput,
  LocalLibraryPlaylistUpdateResult,
  LocalLibraryRootRecord,
  LocalLibrarySnapshot,
  LocalLibraryStats,
  LocalLibraryTrackQueryInput,
  LocalLibraryTrackQueryResult,
  LocalLibraryTrackRecord,
} from '../../shared/local-library.ts'

/** 扫描器写入/更新歌曲索引时使用的完整输入。 */
export interface LocalLibraryTrackUpsertInput {
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
  fileSize: number
  mtimeMs: number
  audioFormat: string
  trackNo: number | null
  discNo: number | null
}

/** 本地曲库数据库配置。 */
export interface LocalLibraryDatabaseOptions {
  dbPath: string
}

type BetterSqliteDatabase = InstanceType<typeof Database>

const SCHEMA_STATEMENTS = [
  `
    CREATE TABLE IF NOT EXISTS library_roots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      root_path TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS local_tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      root_id INTEGER NOT NULL,
      file_path TEXT NOT NULL UNIQUE,
      file_name TEXT NOT NULL,
      title TEXT NOT NULL,
      artist_name TEXT NOT NULL,
      album_name TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      lyric_text TEXT NOT NULL DEFAULT '',
      translated_lyric_text TEXT NOT NULL DEFAULT '',
      cover_path TEXT,
      file_size INTEGER NOT NULL,
      mtime_ms INTEGER NOT NULL,
      audio_format TEXT NOT NULL,
      track_no INTEGER,
      disc_no INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(root_id) REFERENCES library_roots(id) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS local_playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS local_playlist_tracks (
      playlist_id INTEGER NOT NULL,
      track_file_path TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (playlist_id, track_file_path),
      FOREIGN KEY(playlist_id) REFERENCES local_playlists(id) ON DELETE CASCADE,
      FOREIGN KEY(track_file_path) REFERENCES local_tracks(file_path) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS library_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `,
  `CREATE INDEX IF NOT EXISTS idx_local_tracks_root_id ON local_tracks(root_id)`,
  `CREATE INDEX IF NOT EXISTS idx_local_tracks_title ON local_tracks(title)`,
  `CREATE INDEX IF NOT EXISTS idx_local_tracks_artist_name ON local_tracks(artist_name)`,
  `CREATE INDEX IF NOT EXISTS idx_local_tracks_album_name ON local_tracks(album_name)`,
  `CREATE INDEX IF NOT EXISTS idx_local_playlist_tracks_playlist_id ON local_playlist_tracks(playlist_id)`,
  `CREATE INDEX IF NOT EXISTS idx_local_playlist_tracks_track_file_path ON local_playlist_tracks(track_file_path)`,
]

const LOCAL_TRACK_TEXT_COLUMNS = [
  "ALTER TABLE local_tracks ADD COLUMN lyric_text TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE local_tracks ADD COLUMN translated_lyric_text TEXT NOT NULL DEFAULT ''",
]

/** 封面本地路径转换为 renderer 可访问的 local-media URL。 */
function toNullableLocalMediaUrl(coverPath: string | null) {
  return coverPath ? createLocalMediaUrl(coverPath) : ''
}

/** 将 SQLite 歌曲行转换为 shared 曲库歌曲记录。 */
function toLocalLibraryTrackRecord(row: Record<string, unknown>) {
  const trackRow = row as Omit<LocalLibraryTrackRecord, 'coverUrl'>

  return {
    ...trackRow,
    coverUrl: toNullableLocalMediaUrl(trackRow.coverPath),
  } satisfies LocalLibraryTrackRecord
}

/** 将 SQLite 专辑聚合行转换为 shared 专辑记录。 */
function toLocalLibraryAlbumRecord(row: Record<string, unknown>) {
  const typedRow = row as {
    id: number
    name: string
    artistName: string
    trackCount: number
    coverPath: string
  }

  return {
    id: typedRow.id,
    name: typedRow.name,
    artistName: typedRow.artistName,
    trackCount: typedRow.trackCount,
    coverUrl: toNullableLocalMediaUrl(typedRow.coverPath || null),
  } satisfies LocalLibraryAlbumRecord
}

/** 将 SQLite 歌手聚合行转换为 shared 歌手记录。 */
function toLocalLibraryArtistRecord(row: Record<string, unknown>) {
  const typedRow = row as {
    id: number
    name: string
    trackCount: number
    coverPath: string
  }

  return {
    id: typedRow.id,
    name: typedRow.name,
    trackCount: typedRow.trackCount,
    coverUrl: toNullableLocalMediaUrl(typedRow.coverPath || null),
  } satisfies LocalLibraryArtistRecord
}

/** 将 SQLite 歌单聚合行转换为 shared 歌单记录。 */
function toLocalLibraryPlaylistRecord(row: Record<string, unknown>) {
  const typedRow = row as {
    id: number
    name: string
    trackCount: number
    coverPath: string
    createdAt: number
    updatedAt: number
    containsTrack?: number
  }

  return {
    id: typedRow.id,
    name: typedRow.name,
    trackCount: typedRow.trackCount,
    coverUrl: toNullableLocalMediaUrl(typedRow.coverPath || null),
    createdAt: typedRow.createdAt,
    updatedAt: typedRow.updatedAt,
    containsTrack: Boolean(typedRow.containsTrack),
  } satisfies LocalLibraryPlaylistRecord
}

/** 生成 LIKE 查询 pattern，空关键词返回 null 以便跳过 where 条件。 */
function createKeywordPattern(keyword: string) {
  const trimmedKeyword = keyword.trim()
  return trimmedKeyword ? `%${trimmedKeyword}%` : null
}

/** 歌单名统一 trim 后再做唯一性判断。 */
function normalizePlaylistName(name: string) {
  return name.trim()
}

/**
 * 本地曲库 SQLite 封装。
 *
 * 负责 schema 初始化、兼容迁移、歌曲索引、聚合查询和本地歌单写操作；
 * 对外只返回 shared 类型，避免 SQL 行结构泄漏到 IPC/renderer。
 */
export class LocalLibraryDatabase {
  private readonly database: BetterSqliteDatabase

  constructor(options: LocalLibraryDatabaseOptions) {
    this.database = new Database(options.dbPath)
    this.database.pragma('foreign_keys = ON')

    for (const statement of SCHEMA_STATEMENTS) {
      this.database.exec(statement)
    }

    for (const statement of LOCAL_TRACK_TEXT_COLUMNS) {
      try {
        this.database.exec(statement)
      } catch {
        // 兼容已存在字段的旧库迁移，避免升级时因为重复加列中断本地乐库初始化。
      }
    }
  }

  /** 关闭 SQLite 连接，测试或应用退出清理时使用。 */
  close() {
    this.database.close()
  }

  /** 同步曲库根目录，删除根目录会级联删除其歌曲索引。 */
  replaceRoots(paths: string[]) {
    const currentRows = this.database
      .prepare(
        'SELECT id, root_path as path, created_at as createdAt FROM library_roots'
      )
      .all() as LocalLibraryRootRecord[]
    const currentPathSet = new Set(currentRows.map(row => row.path))
    const nextPathSet = new Set(paths)
    const now = Date.now()

    const insertRoot = this.database.prepare(
      'INSERT INTO library_roots (root_path, created_at) VALUES (?, ?)'
    )

    const deleteRoot = this.database.prepare(
      'DELETE FROM library_roots WHERE root_path = ?'
    )

    const syncRoots = this.database.transaction(() => {
      // 根目录同步必须原子化，避免删除旧根后插入新根失败导致整库索引失联。
      for (const path of paths) {
        if (!currentPathSet.has(path)) {
          insertRoot.run(path, now)
        }
      }

      for (const currentRow of currentRows) {
        if (!nextPathSet.has(currentRow.path)) {
          deleteRoot.run(currentRow.path)
        }
      }
    })

    syncRoots()

    return this.getRoots()
  }

  /** 读取已登记曲库根目录。 */
  getRoots() {
    return this.database
      .prepare(
        'SELECT id, root_path as path, created_at as createdAt FROM library_roots ORDER BY root_path COLLATE NOCASE ASC'
      )
      .all() as LocalLibraryRootRecord[]
  }

  /** 按文件路径读取歌曲记录。 */
  getTrackByFilePath(filePath: string) {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            root_id as rootId,
            file_path as filePath,
            file_name as fileName,
            title,
            artist_name as artistName,
            album_name as albumName,
            duration_ms as durationMs,
            lyric_text as lyricText,
            translated_lyric_text as translatedLyricText,
            cover_path as coverPath,
            file_size as fileSize,
            mtime_ms as mtimeMs,
            audio_format as audioFormat,
            track_no as trackNo,
            disc_no as discNo
          FROM local_tracks
          WHERE file_path = ?
        `
      )
      .get(filePath) as Omit<LocalLibraryTrackRecord, 'coverUrl'> | undefined

    if (!row) {
      return null
    }

    return {
      ...row,
      coverUrl: toNullableLocalMediaUrl(row.coverPath),
    } satisfies LocalLibraryTrackRecord
  }

  /** 读取根目录和统计信息概览。 */
  getOverviewSnapshot(): LocalLibraryOverviewSnapshot {
    return {
      roots: this.getRoots(),
      stats: this.getStats(),
    }
  }

  /** 查询歌曲分页列表，支持关键词、专辑和歌手作用域。 */
  queryTracks(
    input: LocalLibraryTrackQueryInput
  ): LocalLibraryTrackQueryResult {
    const keywordPattern = createKeywordPattern(input.keyword)
    const whereClauses = ['1 = 1']
    const params: Array<string | number> = []

    if (keywordPattern) {
      whereClauses.push(
        '(title LIKE ? COLLATE NOCASE OR artist_name LIKE ? COLLATE NOCASE OR album_name LIKE ? COLLATE NOCASE)'
      )
      params.push(keywordPattern, keywordPattern, keywordPattern)
    }

    if (input.scopeType === 'album' && input.scopeValue) {
      whereClauses.push('album_name = ?')
      params.push(input.scopeValue)

      if (input.scopeArtistName) {
        whereClauses.push('artist_name = ?')
        params.push(input.scopeArtistName)
      }
    }

    if (input.scopeType === 'artist' && input.scopeValue) {
      whereClauses.push('artist_name = ?')
      params.push(input.scopeValue)
    }

    const whereClause = whereClauses.join(' AND ')
    const totalRow = this.database
      .prepare(
        `
          SELECT COUNT(*) as total FROM local_tracks
          WHERE ${whereClause}
        `
      )
      .get(...params) as { total: number }

    const items = this.database
      .prepare(
        `
          SELECT
            id,
            root_id as rootId,
            file_path as filePath,
            file_name as fileName,
            title,
            artist_name as artistName,
            album_name as albumName,
            duration_ms as durationMs,
            lyric_text as lyricText,
            translated_lyric_text as translatedLyricText,
            cover_path as coverPath,
            file_size as fileSize,
            mtime_ms as mtimeMs,
            audio_format as audioFormat,
            track_no as trackNo,
            disc_no as discNo
          FROM local_tracks
          WHERE ${whereClause}
          ORDER BY title COLLATE NOCASE ASC, file_path COLLATE NOCASE ASC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, input.limit, input.offset)
      .map(row => toLocalLibraryTrackRecord(row as Record<string, unknown>))

    return {
      items,
      total: totalRow.total,
      offset: input.offset,
      limit: input.limit,
    }
  }

  /** 查询专辑聚合分页列表。 */
  queryAlbums(
    input: LocalLibraryAlbumQueryInput
  ): LocalLibraryAlbumQueryResult {
    const keywordPattern = createKeywordPattern(input.keyword)
    const whereClause = keywordPattern
      ? 'WHERE album_name LIKE ? COLLATE NOCASE OR artist_name LIKE ? COLLATE NOCASE'
      : ''
    const params = keywordPattern
      ? [keywordPattern, keywordPattern]
      : ([] as Array<string | number>)

    const totalRow = this.database
      .prepare(
        `
          SELECT COUNT(*) as total
          FROM (
            SELECT 1
            FROM local_tracks
            ${whereClause}
            GROUP BY album_name, artist_name
          ) grouped_albums
        `
      )
      .get(...params) as { total: number }

    const items = this.database
      .prepare(
        `
          SELECT
            MIN(id) as id,
            album_name as name,
            artist_name as artistName,
            COUNT(*) as trackCount,
            MAX(COALESCE(cover_path, '')) as coverPath
          FROM local_tracks
          ${whereClause}
          GROUP BY album_name, artist_name
          ORDER BY album_name COLLATE NOCASE ASC, artist_name COLLATE NOCASE ASC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, input.limit, input.offset)
      .map(row => toLocalLibraryAlbumRecord(row as Record<string, unknown>))

    return {
      items,
      total: totalRow.total,
      offset: input.offset,
      limit: input.limit,
    }
  }

  /** 查询歌手聚合分页列表。 */
  queryArtists(
    input: LocalLibraryArtistQueryInput
  ): LocalLibraryArtistQueryResult {
    const keywordPattern = createKeywordPattern(input.keyword)
    const whereClause = keywordPattern
      ? 'WHERE artist_name LIKE ? COLLATE NOCASE'
      : ''
    const params = keywordPattern
      ? [keywordPattern]
      : ([] as Array<string | number>)

    const totalRow = this.database
      .prepare(
        `
          SELECT COUNT(*) as total
          FROM (
            SELECT 1
            FROM local_tracks
            ${whereClause}
            GROUP BY artist_name
          ) grouped_artists
        `
      )
      .get(...params) as { total: number }

    const items = this.database
      .prepare(
        `
          SELECT
            MIN(id) as id,
            artist_name as name,
            COUNT(*) as trackCount,
            MAX(COALESCE(cover_path, '')) as coverPath
          FROM local_tracks
          ${whereClause}
          GROUP BY artist_name
          ORDER BY artist_name COLLATE NOCASE ASC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, input.limit, input.offset)
      .map(row => toLocalLibraryArtistRecord(row as Record<string, unknown>))

    return {
      items,
      total: totalRow.total,
      offset: input.offset,
      limit: input.limit,
    }
  }

  /** 查询本地歌单分页列表，并可标记目标歌曲是否已存在于歌单。 */
  queryPlaylists(
    input: LocalLibraryPlaylistQueryInput
  ): LocalLibraryPlaylistQueryResult {
    const keywordPattern = createKeywordPattern(input.keyword)
    const whereClause = keywordPattern
      ? 'WHERE lp.name LIKE ? COLLATE NOCASE'
      : ''
    const params = keywordPattern
      ? [keywordPattern]
      : ([] as Array<string | number>)
    const containsTrackParams = input.trackFilePath
      ? [input.trackFilePath]
      : ([] as Array<string | number>)

    const totalRow = this.database
      .prepare(
        `
          SELECT COUNT(*) as total
          FROM local_playlists lp
          ${whereClause}
        `
      )
      .get(...params) as { total: number }

    const items = this.database
      .prepare(
        `
          SELECT
            lp.id as id,
            lp.name as name,
            COUNT(lpt.track_file_path) as trackCount,
            lp.created_at as createdAt,
            lp.updated_at as updatedAt,
            CASE
              WHEN ? != '' AND EXISTS (
                SELECT 1
                FROM local_playlist_tracks target_lpt
                WHERE target_lpt.playlist_id = lp.id
                  AND target_lpt.track_file_path = ?
              ) THEN 1
              ELSE 0
            END as containsTrack,
            COALESCE((
              SELECT lt.cover_path
              FROM local_playlist_tracks first_lpt
              JOIN local_tracks lt ON lt.file_path = first_lpt.track_file_path
              WHERE first_lpt.playlist_id = lp.id
              ORDER BY first_lpt.created_at ASC
              LIMIT 1
            ), '') as coverPath
          FROM local_playlists lp
          LEFT JOIN local_playlist_tracks lpt ON lpt.playlist_id = lp.id
          ${whereClause}
          GROUP BY lp.id
          ORDER BY lp.updated_at DESC, lp.id DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(
        input.trackFilePath ?? '',
        ...(input.trackFilePath ? containsTrackParams : ['']),
        ...params,
        input.limit,
        input.offset
      )
      .map(row => toLocalLibraryPlaylistRecord(row as Record<string, unknown>))

    return {
      items,
      total: totalRow.total,
      offset: input.offset,
      limit: input.limit,
    }
  }

  /** 查询歌单详情和歌单内歌曲分页。 */
  queryPlaylistDetail(
    input: LocalLibraryPlaylistDetailQueryInput
  ): LocalLibraryPlaylistDetailQueryResult {
    const playlistRow = this.database
      .prepare(
        `
          SELECT
            lp.id as id,
            lp.name as name,
            COUNT(lpt.track_file_path) as trackCount,
            lp.created_at as createdAt,
            lp.updated_at as updatedAt,
            COALESCE((
              SELECT lt.cover_path
              FROM local_playlist_tracks first_lpt
              JOIN local_tracks lt ON lt.file_path = first_lpt.track_file_path
              WHERE first_lpt.playlist_id = lp.id
              ORDER BY first_lpt.created_at ASC
              LIMIT 1
            ), '') as coverPath
          FROM local_playlists lp
          LEFT JOIN local_playlist_tracks lpt ON lpt.playlist_id = lp.id
          WHERE lp.id = ?
          GROUP BY lp.id
        `
      )
      .get(input.playlistId) as Record<string, unknown> | undefined

    if (!playlistRow) {
      return {
        playlist: null,
        items: [],
        total: 0,
        offset: input.offset,
        limit: input.limit,
      }
    }

    const keywordPattern = createKeywordPattern(input.keyword)
    const whereClauses = ['lpt.playlist_id = ?']
    const params: Array<string | number> = [input.playlistId]

    if (keywordPattern) {
      whereClauses.push(
        '(lt.title LIKE ? COLLATE NOCASE OR lt.artist_name LIKE ? COLLATE NOCASE OR lt.album_name LIKE ? COLLATE NOCASE)'
      )
      params.push(keywordPattern, keywordPattern, keywordPattern)
    }

    const whereClause = whereClauses.join(' AND ')
    const totalRow = this.database
      .prepare(
        `
          SELECT COUNT(*) as total
          FROM local_playlist_tracks lpt
          JOIN local_tracks lt ON lt.file_path = lpt.track_file_path
          WHERE ${whereClause}
        `
      )
      .get(...params) as { total: number }

    const items = this.database
      .prepare(
        `
          SELECT
            lt.id as id,
            lt.root_id as rootId,
            lt.file_path as filePath,
            lt.file_name as fileName,
            lt.title as title,
            lt.artist_name as artistName,
            lt.album_name as albumName,
            lt.duration_ms as durationMs,
            lt.lyric_text as lyricText,
            lt.translated_lyric_text as translatedLyricText,
            lt.cover_path as coverPath,
            lt.file_size as fileSize,
            lt.mtime_ms as mtimeMs,
            lt.audio_format as audioFormat,
            lt.track_no as trackNo,
            lt.disc_no as discNo
          FROM local_playlist_tracks lpt
          JOIN local_tracks lt ON lt.file_path = lpt.track_file_path
          WHERE ${whereClause}
          ORDER BY lpt.created_at ASC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, input.limit, input.offset)
      .map(row => toLocalLibraryTrackRecord(row as Record<string, unknown>))

    return {
      playlist: toLocalLibraryPlaylistRecord(playlistRow),
      items,
      total: totalRow.total,
      offset: input.offset,
      limit: input.limit,
    }
  }

  /** 插入或更新歌曲索引，文件路径是唯一键。 */
  upsertTrack(input: LocalLibraryTrackUpsertInput) {
    const now = Date.now()

    this.database
      .prepare(
        `
          INSERT INTO local_tracks (
            root_id,
            file_path,
            file_name,
            title,
            artist_name,
            album_name,
            duration_ms,
            lyric_text,
            translated_lyric_text,
            cover_path,
            file_size,
            mtime_ms,
            audio_format,
            track_no,
            disc_no,
            created_at,
            updated_at
          ) VALUES (
            @rootId,
            @filePath,
            @fileName,
            @title,
            @artistName,
            @albumName,
            @durationMs,
            @lyricText,
            @translatedLyricText,
            @coverPath,
            @fileSize,
            @mtimeMs,
            @audioFormat,
            @trackNo,
            @discNo,
            @createdAt,
            @updatedAt
          )
          ON CONFLICT(file_path) DO UPDATE SET
            root_id = excluded.root_id,
            file_name = excluded.file_name,
            title = excluded.title,
            artist_name = excluded.artist_name,
            album_name = excluded.album_name,
            duration_ms = excluded.duration_ms,
            lyric_text = excluded.lyric_text,
            translated_lyric_text = excluded.translated_lyric_text,
            cover_path = excluded.cover_path,
            file_size = excluded.file_size,
            mtime_ms = excluded.mtime_ms,
            audio_format = excluded.audio_format,
            track_no = excluded.track_no,
            disc_no = excluded.disc_no,
            updated_at = excluded.updated_at
        `
      )
      .run({
        ...input,
        createdAt: now,
        updatedAt: now,
      })
  }

  /** 更新在线匹配写回的歌词/翻译/封面信息。 */
  updateTrackSupplementalMetadata(input: {
    filePath: string
    lyricText: string
    translatedLyricText: string
    coverPath: string | null
  }) {
    this.database
      .prepare(
        `
          UPDATE local_tracks
          SET
            lyric_text = @lyricText,
            translated_lyric_text = @translatedLyricText,
            cover_path = COALESCE(@coverPath, cover_path),
            updated_at = @updatedAt
          WHERE file_path = @filePath
        `
      )
      .run({
        ...input,
        updatedAt: Date.now(),
      })
  }

  /** 从曲库索引中移除指定文件路径。 */
  removeTrackByFilePath(filePath: string) {
    const result = this.database
      .prepare('DELETE FROM local_tracks WHERE file_path = ?')
      .run(filePath)

    return result.changes > 0
  }

  /** 创建本地歌单，重名返回 duplicate。 */
  createPlaylist(
    input: LocalLibraryPlaylistCreateInput
  ): LocalLibraryPlaylistCreateResult {
    const name = normalizePlaylistName(input.name)
    if (!name) {
      return { status: 'duplicate', playlist: null }
    }

    const existing = this.database
      .prepare(
        `
          SELECT
            lp.id as id,
            lp.name as name,
            COUNT(lpt.track_file_path) as trackCount,
            lp.created_at as createdAt,
            lp.updated_at as updatedAt,
            '' as coverPath
          FROM local_playlists lp
          LEFT JOIN local_playlist_tracks lpt ON lpt.playlist_id = lp.id
          WHERE lp.name = ?
          GROUP BY lp.id
        `
      )
      .get(name) as Record<string, unknown> | undefined

    if (existing) {
      return {
        status: 'duplicate',
        playlist: toLocalLibraryPlaylistRecord(existing),
      }
    }

    const now = Date.now()
    const result = this.database
      .prepare(
        `
          INSERT INTO local_playlists (name, created_at, updated_at)
          VALUES (?, ?, ?)
        `
      )
      .run(name, now, now)

    return {
      status: 'created',
      playlist: this.getPlaylistById(Number(result.lastInsertRowid)),
    }
  }

  /** 更新本地歌单名称，重名返回 duplicate。 */
  updatePlaylist(
    input: LocalLibraryPlaylistUpdateInput
  ): LocalLibraryPlaylistUpdateResult {
    const name = normalizePlaylistName(input.name)
    if (!name) {
      return { status: 'duplicate', playlist: null }
    }

    const current = this.getPlaylistById(input.playlistId)
    if (!current) {
      return { status: 'not-found', playlist: null }
    }

    const duplicateRow = this.database
      .prepare(
        `
          SELECT id
          FROM local_playlists
          WHERE name = ? AND id != ?
        `
      )
      .get(name, input.playlistId) as { id: number } | undefined

    if (duplicateRow) {
      return { status: 'duplicate', playlist: current }
    }

    this.database
      .prepare(
        `
          UPDATE local_playlists
          SET name = ?, updated_at = ?
          WHERE id = ?
        `
      )
      .run(name, Date.now(), input.playlistId)

    return {
      status: 'updated',
      playlist: this.getPlaylistById(input.playlistId),
    }
  }

  /** 删除本地歌单，关联歌曲关系通过外键级联清理。 */
  deletePlaylist(
    input: LocalLibraryPlaylistDeleteInput
  ): LocalLibraryPlaylistDeleteResult {
    const result = this.database
      .prepare('DELETE FROM local_playlists WHERE id = ?')
      .run(input.playlistId)

    return {
      deleted: result.changes > 0,
    }
  }

  /** 将歌曲加入歌单，先校验歌单和歌曲都存在。 */
  addTrackToPlaylist(
    input: LocalLibraryPlaylistTrackMutationInput
  ): LocalLibraryPlaylistTrackMutationResult {
    const playlistExists = this.database
      .prepare('SELECT id FROM local_playlists WHERE id = ?')
      .get(input.playlistId) as { id: number } | undefined
    const trackExists = this.database
      .prepare('SELECT file_path FROM local_tracks WHERE file_path = ?')
      .get(input.filePath) as { file_path: string } | undefined

    if (!playlistExists || !trackExists) {
      return { status: 'not-found' }
    }

    const duplicate = this.database
      .prepare(
        `
          SELECT playlist_id
          FROM local_playlist_tracks
          WHERE playlist_id = ? AND track_file_path = ?
        `
      )
      .get(input.playlistId, input.filePath) as
      | { playlist_id: number }
      | undefined

    if (duplicate) {
      return { status: 'duplicate' }
    }

    const now = Date.now()
    const mutate = this.database.transaction(() => {
      this.database
        .prepare(
          `
            INSERT INTO local_playlist_tracks (playlist_id, track_file_path, created_at)
            VALUES (?, ?, ?)
          `
        )
        .run(input.playlistId, input.filePath, now)
      this.database
        .prepare('UPDATE local_playlists SET updated_at = ? WHERE id = ?')
        .run(now, input.playlistId)
    })

    mutate()
    return { status: 'ok' }
  }

  /** 从歌单移除歌曲，并刷新歌单更新时间。 */
  removeTrackFromPlaylist(
    input: LocalLibraryPlaylistTrackMutationInput
  ): LocalLibraryPlaylistTrackMutationResult {
    const result = this.database
      .prepare(
        `
          DELETE FROM local_playlist_tracks
          WHERE playlist_id = ? AND track_file_path = ?
        `
      )
      .run(input.playlistId, input.filePath)

    if (result.changes === 0) {
      return { status: 'not-found' }
    }

    this.database
      .prepare('UPDATE local_playlists SET updated_at = ? WHERE id = ?')
      .run(Date.now(), input.playlistId)

    return { status: 'ok' }
  }

  /** 按 id 读取歌单聚合信息。 */
  private getPlaylistById(playlistId: number) {
    const row = this.database
      .prepare(
        `
          SELECT
            lp.id as id,
            lp.name as name,
            COUNT(lpt.track_file_path) as trackCount,
            lp.created_at as createdAt,
            lp.updated_at as updatedAt,
            COALESCE((
              SELECT lt.cover_path
              FROM local_playlist_tracks first_lpt
              JOIN local_tracks lt ON lt.file_path = first_lpt.track_file_path
              WHERE first_lpt.playlist_id = lp.id
              ORDER BY first_lpt.created_at ASC
              LIMIT 1
            ), '') as coverPath
          FROM local_playlists lp
          LEFT JOIN local_playlist_tracks lpt ON lpt.playlist_id = lp.id
          WHERE lp.id = ?
          GROUP BY lp.id
        `
      )
      .get(playlistId) as Record<string, unknown> | undefined

    return row ? toLocalLibraryPlaylistRecord(row) : null
  }

  /** 删除某个根目录下已经不存在于扫描结果中的旧歌曲索引。 */
  removeTracksMissingFromRoot(rootId: number, existingFilePaths: string[]) {
    if (existingFilePaths.length === 0) {
      this.database
        .prepare('DELETE FROM local_tracks WHERE root_id = ?')
        .run(rootId)
      return
    }

    const placeholders = existingFilePaths.map(() => '?').join(', ')
    this.database
      .prepare(
        `DELETE FROM local_tracks WHERE root_id = ? AND file_path NOT IN (${placeholders})`
      )
      .run(rootId, ...existingFilePaths)
  }

  /** 记录最近扫描时间。 */
  setLastScannedAt(timestamp: number) {
    this.database
      .prepare(
        `
          INSERT INTO library_meta (key, value)
          VALUES ('lastScannedAt', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `
      )
      .run(String(timestamp))
  }

  /** 统计曲库歌曲、专辑、歌手和最近扫描时间。 */
  private getStats(): LocalLibraryStats {
    const totalRow = this.database
      .prepare(
        `
          SELECT
            COUNT(*) as trackCount,
            COUNT(DISTINCT album_name || char(0) || artist_name) as albumCount,
            COUNT(DISTINCT artist_name) as artistCount
          FROM local_tracks
        `
      )
      .get() as {
      trackCount: number
      albumCount: number
      artistCount: number
    }
    const lastScannedAtRow = this.database
      .prepare("SELECT value FROM library_meta WHERE key = 'lastScannedAt'")
      .get() as { value?: string } | undefined

    return {
      rootCount: this.getRoots().length,
      trackCount: totalRow.trackCount,
      albumCount: totalRow.albumCount,
      artistCount: totalRow.artistCount,
      lastScannedAt:
        lastScannedAtRow?.value &&
        Number.isFinite(Number(lastScannedAtRow.value))
          ? Number(lastScannedAtRow.value)
          : null,
    }
  }

  /** 读取完整曲库快照，主要用于页面初始化。 */
  getSnapshot(): LocalLibrarySnapshot {
    const overview = this.getOverviewSnapshot()
    const tracks = this.queryTracks({
      keyword: '',
      scopeType: 'all',
      scopeValue: null,
      scopeArtistName: null,
      offset: 0,
      limit: Number.MAX_SAFE_INTEGER,
    }).items
    const albums = this.queryAlbums({
      keyword: '',
      offset: 0,
      limit: Number.MAX_SAFE_INTEGER,
    }).items
    const artists = this.queryArtists({
      keyword: '',
      offset: 0,
      limit: Number.MAX_SAFE_INTEGER,
    }).items
    const playlists = this.queryPlaylists({
      keyword: '',
      offset: 0,
      limit: Number.MAX_SAFE_INTEGER,
    }).items

    return {
      roots: overview.roots,
      stats: overview.stats,
      tracks,
      albums,
      artists,
      playlists,
    }
  }
}

/** 创建本地曲库数据库实例。 */
export function createLocalLibraryDatabase(
  options: LocalLibraryDatabaseOptions
) {
  return new LocalLibraryDatabase(options)
}
