import assert from 'node:assert/strict'
import test from 'node:test'

import {
  LOCAL_MEDIA_PROTOCOL,
  createLocalMediaUrl,
  parseLocalMediaUrl,
} from '../src/shared/local-media.ts'
import {
  resolveLocalMediaRangeRequest,
  resolveLocalMediaResponseHeaders,
} from '../src/main/protocol/local-media.ts'

test('createLocalMediaUrl builds an app-local protocol url for absolute paths', () => {
  assert.equal(LOCAL_MEDIA_PROTOCOL, 'auralmusic-media')
  assert.equal(
    createLocalMediaUrl('F:\\Downloads\\Blank Space.mp3'),
    'auralmusic-media://local-file?path=F%3A%5CDownloads%5CBlank+Space.mp3'
  )
})

test('parseLocalMediaUrl restores the original file path from a protocol url', () => {
  assert.equal(
    parseLocalMediaUrl(
      'auralmusic-media://local-file?path=F%3A%5CDownloads%5CBlank+Space.mp3'
    ),
    'F:\\Downloads\\Blank Space.mp3'
  )
  assert.equal(
    parseLocalMediaUrl('file:///F:/Downloads/Blank%20Space.mp3'),
    null
  )
  assert.equal(parseLocalMediaUrl('auralmusic-media://local-file'), null)
})

test('resolveLocalMediaRangeRequest parses byte ranges for seekable local audio', () => {
  assert.deepEqual(resolveLocalMediaRangeRequest('bytes=100-499', 1000), {
    start: 100,
    end: 499,
    contentLength: 400,
    contentRange: 'bytes 100-499/1000',
  })

  assert.deepEqual(resolveLocalMediaRangeRequest('bytes=900-', 1000), {
    start: 900,
    end: 999,
    contentLength: 100,
    contentRange: 'bytes 900-999/1000',
  })

  assert.equal(resolveLocalMediaRangeRequest('bytes=1200-1400', 1000), null)
  assert.equal(resolveLocalMediaRangeRequest('items=0-1', 1000), null)
})

test('resolveLocalMediaResponseHeaders returns range-friendly headers for full and partial responses', () => {
  assert.deepEqual(
    resolveLocalMediaResponseHeaders({
      fileSize: 2048,
      fileExtension: '.mp3',
    }),
    {
      'accept-ranges': 'bytes',
      'content-length': '2048',
      'content-type': 'audio/mpeg',
    }
  )

  assert.deepEqual(
    resolveLocalMediaResponseHeaders({
      fileSize: 2048,
      fileExtension: '.flac',
      range: {
        start: 512,
        end: 1023,
        contentLength: 512,
        contentRange: 'bytes 512-1023/2048',
      },
    }),
    {
      'accept-ranges': 'bytes',
      'content-length': '512',
      'content-range': 'bytes 512-1023/2048',
      'content-type': 'audio/flac',
    }
  )
})
