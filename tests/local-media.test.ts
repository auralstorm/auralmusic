import assert from 'node:assert/strict'
import test from 'node:test'

import {
  LOCAL_MEDIA_PROTOCOL,
  createLocalMediaUrl,
  parseLocalMediaUrl,
} from '../src/shared/local-media.ts'

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
