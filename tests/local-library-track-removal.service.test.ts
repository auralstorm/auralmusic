import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { removeLocalLibraryTrack } from '../src/main/local-library/local-library-track-removal.service.ts'
import type { LocalLibraryTrackRecord } from '../src/shared/local-library.ts'

function createTrack(filePath: string): LocalLibraryTrackRecord {
  return {
    id: 1,
    rootId: 1,
    filePath,
    fileName: path.basename(filePath),
    title: 'Track',
    artistName: 'Artist',
    albumName: 'Album',
    durationMs: 1000,
    lyricText: '',
    translatedLyricText: '',
    coverPath: null,
    coverUrl: '',
    fileSize: 1,
    mtimeMs: 1,
    audioFormat: 'mp3',
    trackNo: 1,
    discNo: 1,
  }
}

test('local-library track removal keeps files intact for library-only deletes', async () => {
  const sandbox = mkdtempSync(path.join(tmpdir(), 'auralmusic-track-removal-'))
  const trackPath = path.join(sandbox, 'track.mp3')
  const lrcPath = path.join(sandbox, 'track.lrc')
  writeFileSync(trackPath, 'demo')
  writeFileSync(lrcPath, 'lyric')

  let removedFilePath = ''
  try {
    const result = await removeLocalLibraryTrack(
      {
        filePath: trackPath,
        mode: 'library-only',
      },
      {
        database: {
          getTrackByFilePath: () => createTrack(trackPath),
          removeTrackByFilePath: filePath => {
            removedFilePath = filePath
            return true
          },
        },
      }
    )

    assert.equal(result.removed, true)
    assert.equal(removedFilePath, trackPath)
    assert.equal(existsSync(trackPath), true)
    assert.equal(existsSync(lrcPath), true)
  } finally {
    rmSync(sandbox, { recursive: true, force: true })
  }
})

test('local-library track removal deletes audio and sibling lrc for permanent deletes', async () => {
  const sandbox = mkdtempSync(path.join(tmpdir(), 'auralmusic-track-removal-'))
  const trackPath = path.join(sandbox, 'track.mp3')
  const lrcPath = path.join(sandbox, 'track.lrc')
  writeFileSync(trackPath, 'demo')
  writeFileSync(lrcPath, 'lyric')

  try {
    const result = await removeLocalLibraryTrack(
      {
        filePath: trackPath,
        mode: 'permanent',
      },
      {
        database: {
          getTrackByFilePath: () => createTrack(trackPath),
          removeTrackByFilePath: () => true,
        },
      }
    )

    assert.equal(result.removed, true)
    assert.equal(existsSync(trackPath), false)
    assert.equal(existsSync(lrcPath), false)
  } finally {
    rmSync(sandbox, { recursive: true, force: true })
  }
})
