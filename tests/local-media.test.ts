import assert from 'node:assert/strict'
import test from 'node:test'

import {
  LOCAL_MEDIA_PROTOCOL,
  createLocalMediaUrl,
  isLocalMediaUrl,
  parseLocalMediaUrl,
} from '../src/shared/local-media.ts'
import {
  inferLocalMediaContentType,
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

test('isLocalMediaUrl only accepts the app-local media protocol', () => {
  assert.equal(
    isLocalMediaUrl(
      'auralmusic-media://local-file?path=F%3A%5CDownloads%5CBlank+Space.mp3'
    ),
    true
  )
  assert.equal(isLocalMediaUrl('https://example.com/cover.jpg'), false)
  assert.equal(isLocalMediaUrl(''), false)
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
      'access-control-allow-headers': 'Range',
      'access-control-allow-methods': 'GET, HEAD',
      'access-control-allow-origin': '*',
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
      'access-control-allow-headers': 'Range',
      'access-control-allow-methods': 'GET, HEAD',
      'access-control-allow-origin': '*',
      'content-length': '512',
      'content-range': 'bytes 512-1023/2048',
      'content-type': 'audio/flac',
    }
  )
})

test('resolveLocalMediaResponseHeaders returns image content types for cached images', () => {
  assert.equal(inferLocalMediaContentType('.jpg'), 'image/jpeg')
  assert.equal(inferLocalMediaContentType('.png'), 'image/png')
  assert.equal(inferLocalMediaContentType('.webp'), 'image/webp')
  assert.equal(inferLocalMediaContentType('.avif'), 'image/avif')
})

test('inferLocalMediaContentType falls back to file signatures when the path has no extension', () => {
  assert.equal(
    inferLocalMediaContentType(
      '',
      new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00, 0x00])
    ),
    'audio/mpeg'
  )

  assert.equal(
    inferLocalMediaContentType(
      '',
      new Uint8Array([0x66, 0x4c, 0x61, 0x43, 0x00, 0x00])
    ),
    'audio/flac'
  )
})
