import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeRequestHeadersForFetch } from '../src/main/auth/request-header.ts'

test('normalizeRequestHeadersForFetch flattens array header values for fetch', () => {
  const headers = normalizeRequestHeadersForFetch({
    Cookie: ['MUSIC_U=fresh-token', 'NMTID=device-token'],
    Accept: 'application/json',
    Empty: undefined,
  })

  assert.deepEqual(headers, {
    Cookie: 'MUSIC_U=fresh-token; NMTID=device-token',
    Accept: 'application/json',
  })
})
