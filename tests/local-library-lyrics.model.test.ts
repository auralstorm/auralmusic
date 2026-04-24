import assert from 'node:assert/strict'
import test from 'node:test'

import {
  readEmbeddedTranslatedLyricText,
  readEmbeddedLyricTextBundle,
  splitBilingualLrcText,
} from '../src/main/local-library/local-library-lyrics.model.ts'

test('splitBilingualLrcText separates same-timestamp translation lines into tlyric', () => {
  const bundle = splitBilingualLrcText(`
[00:01.00]Original line
[00:01.00]Translated line
[00:05.50]Second original
[00:05.50]Second translated
`)

  assert.equal(
    bundle.lrc.trim(),
    ['[00:01.00]Original line', '[00:05.50]Second original'].join('\n')
  )
  assert.equal(
    bundle.tlyric.trim(),
    ['[00:01.00]Translated line', '[00:05.50]Second translated'].join('\n')
  )
})

test('readEmbeddedLyricTextBundle converts synchronized and unsynchronized embedded lyrics into playback-ready text', () => {
  const bundle = readEmbeddedLyricTextBundle([
    {
      text: undefined,
      syncText: [
        { timestamp: 1000, text: 'First line' },
        { timestamp: 3500, text: 'Second line' },
      ],
    },
    {
      text: 'Translated first\nTranslated second',
      syncText: [],
    },
  ])

  assert.equal(
    bundle.lrc.trim(),
    ['[00:01.000]First line', '[00:03.500]Second line'].join('\n')
  )
  assert.equal(
    bundle.tlyric.trim(),
    ['[00:00.000]Translated first', '[00:04.000]Translated second'].join('\n')
  )
})

test('readEmbeddedTranslatedLyricText reads translated lyrics from TXXX tags written by downloader', () => {
  const translated = readEmbeddedTranslatedLyricText({
    'ID3v2.3': [
      {
        id: 'TXXX:Translated Lyrics',
        value: '[00:00.00]translated line\n[00:10.00]next translated',
      },
    ],
  })

  assert.equal(
    translated,
    '[00:00.00]translated line\n[00:10.00]next translated'
  )
})
