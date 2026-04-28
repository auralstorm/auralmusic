import assert from 'node:assert/strict'
import test from 'node:test'

import { shouldFallbackBuiltinMetadata } from '../src/renderer/services/music-metadata/platform-metadata-fallback.service.ts'

test('lyrics do not cross-fallback in phase 1', () => {
  assert.equal(shouldFallbackBuiltinMetadata('lyric', 'tx'), false)
  assert.equal(shouldFallbackBuiltinMetadata('lyric', 'wy'), false)
})

test('covers may fallback to placeholder in phase 1', () => {
  assert.equal(shouldFallbackBuiltinMetadata('cover', 'kw'), true)
  assert.equal(shouldFallbackBuiltinMetadata('cover', null), true)
})
