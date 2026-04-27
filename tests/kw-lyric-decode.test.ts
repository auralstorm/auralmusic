import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import test from 'node:test'
import { deflateSync } from 'node:zlib'

import {
  buildKwNewLyricParams,
  decodeKwLyricResponse,
} from '../src/main/music-source/kw-lyric-decode.ts'
import { createLxHttpRequestResponse } from '../src/main/music-source/lx-http-request.ts'

test('buildKwNewLyricParams creates the encrypted kuwo lyric query payload', () => {
  const params = buildKwNewLyricParams('807791', true)

  assert.ok(params.length > 20)
  assert.match(params, /^[A-Za-z0-9+/=]+$/)
})

test('decodeKwLyricResponse inflates plain kuwo lyric responses', async () => {
  const lyric = '[00:00.00]kuwo lyric'
  const raw = Buffer.concat([
    Buffer.from('tp=content\r\n\r\n'),
    deflateSync(Buffer.from(lyric, 'utf8')),
  ])

  const decoded = await decodeKwLyricResponse({
    lrcBase64: raw.toString('base64'),
    isGetLyricx: false,
  })

  assert.equal(decoded, lyric)
})

test('createLxHttpRequestResponse preserves binary raw bytes', () => {
  const raw = Buffer.from([0, 255, 10, 42])
  const response = createLxHttpRequestResponse(200, 'OK', {}, raw)

  assert.deepEqual(Array.from(response.raw), Array.from(raw))
})
