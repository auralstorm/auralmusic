import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeLxScriptRequestResultToUrl,
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

test('selectSupportedLxQuality falls back through supported qualities', () => {
  assert.equal(selectSupportedLxQuality(['128k', '320k'], '320k'), '320k')
  assert.equal(selectSupportedLxQuality(['128k', '320k'], 'flac'), '320k')
  assert.equal(selectSupportedLxQuality(['128k'], 'flac24bit'), '128k')
  assert.equal(selectSupportedLxQuality([], '320k'), null)
})
