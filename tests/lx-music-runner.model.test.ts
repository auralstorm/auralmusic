import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createLxFetchRequestOptions,
  normalizeLxScriptRequestResultToLyric,
  normalizeLxScriptRequestResultToUrl,
  readLxResponseBodyUrl,
  resolveLxMusicUrlResult,
  selectSupportedLxQuality,
} from '../src/renderer/services/music-source/LxMusicSourceRunner.ts'

test('normalizeLxScriptRequestResultToUrl reads common lx result shapes', () => {
  assert.equal(
    normalizeLxScriptRequestResultToUrl('https://a.test/a.mp3'),
    'https://a.test/a.mp3'
  )
  assert.equal(
    normalizeLxScriptRequestResultToUrl({ url: 'https://a.test/b.mp3' }),
    'https://a.test/b.mp3'
  )
  assert.equal(
    normalizeLxScriptRequestResultToUrl({ data: 'https://a.test/c.mp3' }),
    'https://a.test/c.mp3'
  )
  assert.equal(
    normalizeLxScriptRequestResultToUrl({
      data: { url: 'https://a.test/d.mp3' },
    }),
    'https://a.test/d.mp3'
  )
  assert.equal(normalizeLxScriptRequestResultToUrl({}), null)
  assert.equal(normalizeLxScriptRequestResultToUrl(null), null)
})

test('normalizeLxScriptRequestResultToLyric reads common lx lyric result shapes', () => {
  assert.equal(
    normalizeLxScriptRequestResultToLyric('[00:01.00]line'),
    '[00:01.00]line'
  )
  assert.equal(
    normalizeLxScriptRequestResultToLyric({ lyric: '[00:02.00]field' }),
    '[00:02.00]field'
  )
  assert.equal(
    normalizeLxScriptRequestResultToLyric({
      data: { lyric: '[00:03.00]nested' },
    }),
    '[00:03.00]nested'
  )
  assert.equal(normalizeLxScriptRequestResultToLyric({}), null)
})

test('selectSupportedLxQuality falls back through supported qualities', () => {
  assert.equal(selectSupportedLxQuality(['128k', '320k'], '320k'), '320k')
  assert.equal(selectSupportedLxQuality(['128k', '320k'], 'flac'), '320k')
  assert.equal(selectSupportedLxQuality(['128k'], 'flac24bit'), '128k')
  assert.equal(selectSupportedLxQuality([], '320k'), null)
})

test('resolveLxMusicUrlResult uses last http music url as a compatibility fallback', () => {
  assert.equal(
    resolveLxMusicUrlResult(undefined, 'https://cdn.test/fallback.mp3'),
    'https://cdn.test/fallback.mp3'
  )
  assert.equal(
    resolveLxMusicUrlResult(
      { url: 'https://cdn.test/direct.mp3' },
      'https://cdn.test/fallback.mp3'
    ),
    'https://cdn.test/direct.mp3'
  )
  assert.equal(resolveLxMusicUrlResult(undefined, ''), null)
})

test('readLxResponseBodyUrl extracts playable url from response body', () => {
  assert.equal(
    readLxResponseBodyUrl({ code: 0, url: 'https://cdn.test/song.mp3' }),
    'https://cdn.test/song.mp3'
  )
  assert.equal(readLxResponseBodyUrl({ code: 2, msg: 'failed' }), null)
  assert.equal(readLxResponseBodyUrl('plain'), null)
})

test('createLxFetchRequestOptions mirrors Alger renderer fetch fallback defaults', () => {
  const controller = new AbortController()

  assert.deepEqual(
    createLxFetchRequestOptions(
      {
        method: 'GET',
        headers: {
          'X-Request-Key': 'share-v2',
        },
      },
      controller.signal
    ),
    {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Request-Key': 'share-v2',
      },
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit',
    }
  )
})
