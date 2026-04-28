import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import {
  cleanupOldLogFiles,
  MAIN_LOG_ARCHIVE_LIMIT,
  MAIN_LOG_MAX_SIZE_BYTES,
  MAIN_LOG_RETENTION_DAYS,
  rotateLogFile,
} from '../src/main/logging/log-retention.model.ts'

test('log retention constants use explicit production limits', () => {
  assert.equal(MAIN_LOG_MAX_SIZE_BYTES, 5 * 1024 * 1024)
  assert.equal(MAIN_LOG_ARCHIVE_LIMIT, 3)
  assert.equal(MAIN_LOG_RETENTION_DAYS, 14)
})

test('rotateLogFile keeps only recent archive files', () => {
  const files = new Set([
    'C:\\logs\\main.log',
    'C:\\logs\\main.1.log',
    'C:\\logs\\main.2.log',
    'C:\\logs\\main.3.log',
  ])
  const operations: string[] = []

  rotateLogFile('C:\\logs\\main.log', {
    exists: targetPath => files.has(targetPath),
    remove: targetPath => {
      operations.push(`remove:${targetPath}`)
      files.delete(targetPath)
    },
    rename: (from, to) => {
      operations.push(`rename:${from}->${to}`)
      files.delete(from)
      files.add(to)
    },
  })

  assert.deepEqual(operations, [
    'remove:C:\\logs\\main.3.log',
    'rename:C:\\logs\\main.2.log->C:\\logs\\main.3.log',
    'rename:C:\\logs\\main.1.log->C:\\logs\\main.2.log',
    'rename:C:\\logs\\main.log->C:\\logs\\main.1.log',
  ])
})

test('cleanupOldLogFiles removes old log files only', () => {
  const now = new Date('2026-04-27T00:00:00.000Z').getTime()
  const removed: string[] = []
  const oldTime = now - 15 * 24 * 60 * 60 * 1000
  const recentTime = now - 2 * 24 * 60 * 60 * 1000

  cleanupOldLogFiles('C:\\logs', {
    now: () => now,
    readDir: () => ['main.log', 'main.1.log', 'readme.txt'],
    stat: targetPath => ({
      isFile: () => true,
      mtimeMs:
        path.basename(targetPath) === 'main.1.log' ? oldTime : recentTime,
    }),
    remove: targetPath => {
      removed.push(targetPath)
    },
  })

  assert.deepEqual(removed, ['C:\\logs\\main.1.log'])
})
