import assert from 'node:assert/strict'
import test from 'node:test'

import { readLogUrlHost, sanitizeLogMeta } from '../src/shared/logging.ts'

test('sanitizeLogMeta redacts sensitive keys and long media urls', () => {
  const sanitized = sanitizeLogMeta({
    token: 'secret-token',
    headers: {
      cookie: 'MUSIC_U=secret',
      authorization: 'Bearer secret',
    },
    sourceUrl:
      'https://cdn.example.com/audio/song.mp3?token=very-secret&expires=9999',
    nested: {
      password: 'secret-password',
    },
  })

  assert.deepEqual(sanitized, {
    token: '[redacted]',
    headers: {
      cookie: '[redacted]',
      authorization: '[redacted]',
    },
    sourceUrl: '[redacted-url]',
    nested: {
      password: '[redacted]',
    },
  })
})

test('sanitizeLogMeta serializes error objects without leaking full objects', () => {
  const error = new Error('network failed')
  const sanitized = sanitizeLogMeta({ error })

  assert.equal(sanitized.error.name, 'Error')
  assert.equal(sanitized.error.message, 'network failed')
  assert.equal(typeof sanitized.error.stack, 'string')
})

test('sanitizeLogMeta collapses local file paths to basenames', () => {
  const sanitized = sanitizeLogMeta({
    targetPath: 'C:\\Users\\tester\\Music\\song.mp3',
    localPath: '/Users/tester/Music/demo.flac',
  })

  assert.equal(sanitized.targetPath, 'song.mp3')
  assert.equal(sanitized.localPath, 'demo.flac')
})

test('readLogUrlHost keeps only diagnostic host information', () => {
  assert.equal(
    readLogUrlHost('https://share.duanx.cn/url/mg/807791/128k?sign=secret'),
    'share.duanx.cn'
  )
  assert.equal(readLogUrlHost('/relative/audio.mp3'), null)
})
