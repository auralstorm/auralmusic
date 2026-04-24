import assert from 'node:assert/strict'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  createLocalLibraryScanContext,
  createLocalLibraryDatabase,
  scanLocalLibraryRoots,
} from '../src/main/local-library/index.ts'

const dbSource = readFileSync(
  new URL('../src/main/local-library/db.ts', import.meta.url),
  'utf8'
)

test('local library database schema declares the required tables and indexes', () => {
  assert.match(dbSource, /CREATE TABLE IF NOT EXISTS library_roots/)
  assert.match(dbSource, /CREATE TABLE IF NOT EXISTS local_tracks/)
  assert.match(dbSource, /CREATE TABLE IF NOT EXISTS library_meta/)
  assert.match(dbSource, /lyric_text TEXT NOT NULL DEFAULT ''/)
  assert.match(dbSource, /translated_lyric_text TEXT NOT NULL DEFAULT ''/)
  assert.match(
    dbSource,
    /UNIQUE,\s*\n?\s*root_id INTEGER NOT NULL|file_path TEXT NOT NULL UNIQUE/
  )
  assert.match(dbSource, /idx_local_tracks_root_id/)
  assert.match(dbSource, /idx_local_tracks_title/)
  assert.match(dbSource, /idx_local_tracks_artist_name/)
  assert.match(dbSource, /idx_local_tracks_album_name/)
})

test('local library scan imports supported tracks and deduplicates repeated roots', async () => {
  const sandboxRoot = mkdtempSync(
    path.join(tmpdir(), 'auralmusic-local-library-')
  )
  const coverCacheDir = path.join(sandboxRoot, 'covers')
  const musicRoot = path.join(sandboxRoot, 'music')
  mkdirSync(coverCacheDir, { recursive: true })
  mkdirSync(musicRoot, { recursive: true })

  writeFileSync(
    path.join(musicRoot, 'track-a.mp3'),
    Buffer.from('ID3demo-track-a')
  )
  writeFileSync(
    path.join(musicRoot, 'track-b.flac'),
    Buffer.from('fLaCdemo-track-b')
  )
  writeFileSync(
    path.join(musicRoot, 'track-a.lrc'),
    ['[00:01.00]Track A lyric', '[00:01.00]Track A translation'].join('\n')
  )
  writeFileSync(path.join(musicRoot, 'ignore.txt'), 'not-audio')

  const roots = new Map<
    number,
    { id: number; path: string; createdAt: number }
  >()
  const trackRecords = new Map<string, Record<string, unknown>>()
  const database = {
    replaceRoots: (nextRoots: string[]) => {
      roots.clear()
      nextRoots.forEach((rootPath, index) => {
        roots.set(index + 1, {
          id: index + 1,
          path: rootPath,
          createdAt: Date.now(),
        })
      })

      return [...roots.values()]
    },
    upsertTrack: (record: Record<string, unknown>) => {
      trackRecords.set(String(record.filePath), record)
    },
    getTrackByFilePath: (filePath: string) => {
      const record = trackRecords.get(filePath)
      if (!record) {
        return null
      }

      return {
        id: 0,
        rootId: Number(record.rootId),
        filePath: String(record.filePath),
        fileName: String(record.fileName),
        title: String(record.title),
        artistName: String(record.artistName),
        albumName: String(record.albumName),
        durationMs: Number(record.durationMs),
        lyricText: String(record.lyricText ?? ''),
        translatedLyricText: String(record.translatedLyricText ?? ''),
        coverPath: null,
        coverUrl: '',
        fileSize: Number(record.fileSize),
        mtimeMs: Number(record.mtimeMs),
        audioFormat: String(record.audioFormat),
        trackNo: null,
        discNo: null,
      }
    },
    removeTracksMissingFromRoot: (
      rootId: number,
      existingFilePaths: string[]
    ) => {
      for (const [filePath, record] of trackRecords.entries()) {
        if (record.rootId === rootId && !existingFilePaths.includes(filePath)) {
          trackRecords.delete(filePath)
        }
      }
    },
    setLastScannedAt: () => undefined,
    getSnapshot: () => {
      const tracks = [...trackRecords.values()].map(record => ({
        id: 0,
        rootId: Number(record.rootId),
        filePath: String(record.filePath),
        fileName: String(record.fileName),
        title: String(record.title),
        artistName: String(record.artistName),
        albumName: String(record.albumName),
        durationMs: Number(record.durationMs),
        lyricText: String(record.lyricText ?? ''),
        translatedLyricText: String(record.translatedLyricText ?? ''),
        coverPath: null,
        coverUrl: '',
        fileSize: Number(record.fileSize),
        mtimeMs: Number(record.mtimeMs),
        audioFormat: String(record.audioFormat),
        trackNo: null,
        discNo: null,
      }))

      return {
        roots: [...roots.values()],
        stats: {
          rootCount: roots.size,
          trackCount: tracks.length,
          albumCount: new Set(tracks.map(track => track.albumName)).size,
          artistCount: new Set(tracks.map(track => track.artistName)).size,
          lastScannedAt: null,
        },
        tracks,
        albums: [],
        artists: [],
      }
    },
    close: () => undefined,
  }
  const scanContext = createLocalLibraryScanContext({
    coverCacheDir,
    parseAudioMetadata: async filePath => ({
      title: path.basename(filePath, path.extname(filePath)),
      artistName: '',
      albumName: '',
      durationMs: 123000,
      lyricText: filePath.endsWith('track-b.flac') ? 'embedded lyric' : '',
      translatedLyricText: filePath.endsWith('track-b.flac')
        ? 'embedded translation'
        : '',
      trackNo: null,
      discNo: null,
      coverBytes: null,
      coverExtension: null,
    }),
  })

  try {
    const summary = await scanLocalLibraryRoots({
      database: database as never,
      scanContext,
      roots: [musicRoot, `${musicRoot}${path.sep}`],
    })

    assert.equal(summary.rootCount, 1)
    assert.equal(summary.importedCount, 2)
    assert.equal(summary.skippedCount, 1)

    const snapshot = database.getSnapshot()
    assert.equal(snapshot.stats.trackCount, 2)
    assert.equal(snapshot.stats.albumCount, 1)
    assert.equal(snapshot.stats.artistCount, 1)
    assert.deepEqual(
      snapshot.tracks.map(track => track.title),
      ['track-a', 'track-b']
    )
    assert.deepEqual(
      snapshot.tracks.map(track => track.artistName),
      ['未知歌手', '未知歌手']
    )
    assert.equal(snapshot.tracks[0]?.lyricText, '[00:01.00]Track A lyric')
    assert.equal(
      snapshot.tracks[0]?.translatedLyricText,
      '[00:01.00]Track A translation'
    )
    assert.equal(snapshot.tracks[1]?.lyricText, 'embedded lyric')
    assert.equal(
      snapshot.tracks[1]?.translatedLyricText,
      'embedded translation'
    )
  } finally {
    database.close()
    rmSync(sandboxRoot, { recursive: true, force: true })
  }
})

test('local library scan only imports configured audio formats', async () => {
  const sandboxRoot = mkdtempSync(
    path.join(tmpdir(), 'auralmusic-local-library-')
  )
  const coverCacheDir = path.join(sandboxRoot, 'covers')
  const musicRoot = path.join(sandboxRoot, 'music')
  mkdirSync(coverCacheDir, { recursive: true })
  mkdirSync(musicRoot, { recursive: true })

  writeFileSync(
    path.join(musicRoot, 'track-a.mp3'),
    Buffer.from('ID3demo-track-a')
  )
  writeFileSync(
    path.join(musicRoot, 'track-b.flac'),
    Buffer.from('fLaCdemo-track-b')
  )

  const roots = new Map<
    number,
    { id: number; path: string; createdAt: number }
  >()
  const trackRecords = new Map<string, Record<string, unknown>>()
  const database = {
    replaceRoots: (nextRoots: string[]) => {
      roots.clear()
      nextRoots.forEach((rootPath, index) => {
        roots.set(index + 1, {
          id: index + 1,
          path: rootPath,
          createdAt: Date.now(),
        })
      })

      return [...roots.values()]
    },
    upsertTrack: (record: Record<string, unknown>) => {
      trackRecords.set(String(record.filePath), record)
    },
    getTrackByFilePath: (filePath: string) => {
      const record = trackRecords.get(filePath)
      if (!record) {
        return null
      }

      return {
        id: 0,
        rootId: Number(record.rootId),
        filePath: String(record.filePath),
        fileName: String(record.fileName),
        title: String(record.title),
        artistName: String(record.artistName),
        albumName: String(record.albumName),
        durationMs: Number(record.durationMs),
        lyricText: String(record.lyricText ?? ''),
        translatedLyricText: String(record.translatedLyricText ?? ''),
        coverPath: null,
        coverUrl: '',
        fileSize: Number(record.fileSize),
        mtimeMs: Number(record.mtimeMs),
        audioFormat: String(record.audioFormat),
        trackNo: null,
        discNo: null,
      }
    },
    removeTracksMissingFromRoot: () => undefined,
    setLastScannedAt: () => undefined,
    getSnapshot: () => undefined,
    close: () => undefined,
  }

  try {
    const summary = await scanLocalLibraryRoots({
      database: database as never,
      scanContext: createLocalLibraryScanContext({
        coverCacheDir,
        parseAudioMetadata: async filePath => ({
          title: path.basename(filePath, path.extname(filePath)),
          artistName: '',
          albumName: '',
          durationMs: 123000,
          lyricText: '',
          translatedLyricText: '',
          trackNo: null,
          discNo: null,
          coverBytes: null,
          coverExtension: null,
        }),
      }),
      roots: [musicRoot],
      formats: ['flac'],
    })

    assert.equal(summary.importedCount, 1)
    assert.deepEqual(
      [...trackRecords.values()].map(record => record.audioFormat),
      ['flac']
    )
  } finally {
    database.close()
    rmSync(sandboxRoot, { recursive: true, force: true })
  }
})

test('local library scan skips unchanged files and only counts real updates', async () => {
  const sandboxRoot = mkdtempSync(
    path.join(tmpdir(), 'auralmusic-local-library-')
  )
  const coverCacheDir = path.join(sandboxRoot, 'covers')
  const musicRoot = path.join(sandboxRoot, 'music')
  mkdirSync(coverCacheDir, { recursive: true })
  mkdirSync(musicRoot, { recursive: true })

  const trackPath = path.join(musicRoot, 'track-a.mp3')
  writeFileSync(trackPath, Buffer.from('ID3demo-track-a'))

  const roots = new Map<
    number,
    { id: number; path: string; createdAt: number }
  >()
  const trackRecords = new Map<string, Record<string, unknown>>()
  let parseCount = 0
  const database = {
    replaceRoots: (nextRoots: string[]) => {
      roots.clear()
      nextRoots.forEach((rootPath, index) => {
        roots.set(index + 1, {
          id: index + 1,
          path: rootPath,
          createdAt: Date.now(),
        })
      })

      return [...roots.values()]
    },
    getTrackByFilePath: (filePath: string) => {
      const record = trackRecords.get(filePath)
      if (!record) {
        return null
      }

      return {
        id: 0,
        rootId: Number(record.rootId),
        filePath: String(record.filePath),
        fileName: String(record.fileName),
        title: String(record.title),
        artistName: String(record.artistName),
        albumName: String(record.albumName),
        durationMs: Number(record.durationMs),
        lyricText: String(record.lyricText ?? ''),
        translatedLyricText: String(record.translatedLyricText ?? ''),
        coverPath: null,
        coverUrl: '',
        fileSize: Number(record.fileSize),
        mtimeMs: Number(record.mtimeMs),
        audioFormat: String(record.audioFormat),
        trackNo: null,
        discNo: null,
      }
    },
    upsertTrack: (record: Record<string, unknown>) => {
      trackRecords.set(String(record.filePath), record)
    },
    removeTracksMissingFromRoot: () => undefined,
    setLastScannedAt: () => undefined,
    close: () => undefined,
  }

  try {
    const scanContext = createLocalLibraryScanContext({
      coverCacheDir,
      parseAudioMetadata: async filePath => {
        parseCount += 1
        return {
          title: path.basename(filePath, path.extname(filePath)),
          artistName: '',
          albumName: '',
          durationMs: 123000,
          lyricText: '',
          translatedLyricText: '',
          trackNo: null,
          discNo: null,
          coverBytes: null,
          coverExtension: null,
        }
      },
    })

    const firstSummary = await scanLocalLibraryRoots({
      database: database as never,
      scanContext,
      roots: [musicRoot],
    })
    const secondSummary = await scanLocalLibraryRoots({
      database: database as never,
      scanContext,
      roots: [musicRoot],
    })

    assert.equal(firstSummary.importedCount, 1)
    assert.equal(secondSummary.importedCount, 0)
    assert.equal(parseCount, 1)
  } finally {
    database.close()
    rmSync(sandboxRoot, { recursive: true, force: true })
  }
})

test('local library database declares overview and paged query methods', () => {
  assert.match(
    dbSource,
    /getOverviewSnapshot\(\):\s*LocalLibraryOverviewSnapshot/
  )
  assert.match(dbSource, /queryTracks\(input:\s*LocalLibraryTrackQueryInput\)/)
  assert.match(dbSource, /queryAlbums\(input:\s*LocalLibraryAlbumQueryInput\)/)
  assert.match(
    dbSource,
    /queryArtists\(input:\s*LocalLibraryArtistQueryInput\)/
  )
  assert.match(dbSource, /LIMIT \? OFFSET \?/)
  assert.match(dbSource, /SELECT COUNT\(\*\) as total FROM local_tracks/)
})
