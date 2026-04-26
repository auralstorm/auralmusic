import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getBuiltinTrackLyric,
  getBuiltinTrackCover,
  resolveTrackPlatformMetadataSource,
  shouldUseBuiltinPlatformMetadata,
} from '../src/renderer/services/music-metadata/platform-metadata.service.ts'
import { builtinLyricProviders } from '../src/renderer/services/music-metadata/providers/lyric/index.ts'
import { builtinCoverProviders } from '../src/renderer/services/music-metadata/providers/cover/index.ts'

test('resolveTrackPlatformMetadataSource returns null for null track', () => {
  assert.equal(resolveTrackPlatformMetadataSource(null), null)
})

test('resolveTrackPlatformMetadataSource prefers locked platform', () => {
  assert.equal(
    resolveTrackPlatformMetadataSource({
      lockedPlatform: 'tx',
      lxInfo: { source: 'kg' },
    }),
    'tx'
  )
})

test('resolveTrackPlatformMetadataSource falls back to lxInfo source', () => {
  assert.equal(
    resolveTrackPlatformMetadataSource({
      lxInfo: { source: 'mg' },
    }),
    'mg'
  )
})

test('resolveTrackPlatformMetadataSource trims whitespace around source ids', () => {
  assert.equal(
    resolveTrackPlatformMetadataSource({
      lockedPlatform: ' tx ',
    }),
    'tx'
  )
})

test('resolveTrackPlatformMetadataSource falls back when lockedPlatform is invalid but lxInfo source is valid', () => {
  assert.equal(
    resolveTrackPlatformMetadataSource({
      lockedPlatform: 'qq',
      lxInfo: { source: ' kg ' },
    }),
    'kg'
  )
})

test('shouldUseBuiltinPlatformMetadata rejects invalid source ids', () => {
  assert.equal(shouldUseBuiltinPlatformMetadata('qq'), false)
  assert.equal(shouldUseBuiltinPlatformMetadata(''), false)
})

test('shouldUseBuiltinPlatformMetadata keeps builtin sources on builtin path', () => {
  assert.equal(shouldUseBuiltinPlatformMetadata('wy'), true)
  assert.equal(shouldUseBuiltinPlatformMetadata(' tx '), true)
  assert.equal(shouldUseBuiltinPlatformMetadata('tx'), true)
  assert.equal(shouldUseBuiltinPlatformMetadata(null), false)
})

test('getBuiltinTrackLyric defaults remote tracks without explicit source metadata to wy provider', async () => {
  const originalProvider = builtinLyricProviders.wy
  builtinLyricProviders.wy = {
    async getLyric(track) {
      assert.equal(track.id, 186843)
      return { lyric: '[00:00.00]七里香' }
    },
  }

  try {
    const result = await getBuiltinTrackLyric({
      id: 186843,
      lockedPlatform: undefined,
      lxInfo: undefined,
    })

    assert.deepEqual(result, { lyric: '[00:00.00]七里香' })
  } finally {
    builtinLyricProviders.wy = originalProvider
  }
})

test('getBuiltinTrackCover defaults remote tracks without explicit source metadata to wy provider', async () => {
  const originalProvider = builtinCoverProviders.wy
  builtinCoverProviders.wy = {
    async getCover(track) {
      assert.equal(track.id, 186843)
      return { coverUrl: 'https://example.com/qilixiang.jpg' }
    },
  }

  try {
    const result = await getBuiltinTrackCover({
      id: 186843,
      lockedPlatform: undefined,
      lxInfo: undefined,
    })

    assert.deepEqual(result, {
      coverUrl: 'https://example.com/qilixiang.jpg',
    })
  } finally {
    builtinCoverProviders.wy = originalProvider
  }
})
