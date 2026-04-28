import assert from 'node:assert/strict'
import test from 'node:test'

import { createFetchLyricTextBundle } from '../src/renderer/components/PlayerScene/player-lyrics.service.ts'

function createRemoteTrack(overrides: Record<string, unknown> = {}) {
  return {
    id: 1139129604,
    name: '兰花草',
    artistNames: '银临',
    albumName: '兰花草',
    coverUrl: '',
    duration: 240000,
    sourceUrl: 'https://example.com/audio.mp3',
    lockedPlatform: 'tx',
    lxInfo: {
      songmid: '1139129604',
      source: 'tx',
    },
    ...overrides,
  }
}

function createLocalTrack(overrides: Record<string, unknown> = {}) {
  return {
    id: -7,
    name: 'Local Track',
    artistNames: 'Local Artist',
    albumName: 'Local Album',
    coverUrl: '',
    duration: 123000,
    sourceUrl:
      'auralmusic-media://local-file?path=F%3A%5Cdownloads%5Clocal-track.mp3',
    lyricText: '[00:01.00]Local lyric',
    translatedLyricText: '[00:01.00]本地歌词',
    ...overrides,
  }
}

test('non-wy remote track uses builtin platform lyric provider and caches by source', async () => {
  const writes: Array<{ cacheKey: string; payload: unknown }> = []
  const requestedTracks: unknown[] = []
  const fetchLyricTextBundle = createFetchLyricTextBundle({
    readCachedLyricPayload: async () => null,
    writeLyricPayload: (cacheKey, payload) => {
      writes.push({ cacheKey, payload })
    },
    getBuiltinTrackLyric: async track => {
      requestedTracks.push(track)
      return {
        lyric: '[00:00.00]兰花草',
        translatedLyric: '[00:00.00]Orchid',
      }
    },
  })

  const result = await fetchLyricTextBundle(
    1139129604,
    createRemoteTrack({
      lockedPlatform: 'tx',
      lxInfo: {
        songmid: '1139129604',
        source: 'tx',
      },
    }) as never
  )

  assert.deepEqual(result, {
    lrc: '[00:00.00]兰花草',
    tlyric: '[00:00.00]Orchid',
    yrc: '',
  })
  assert.equal(requestedTracks.length, 1)
  assert.equal(writes.length, 1)
  assert.equal(writes[0]?.cacheKey, 'lyrics:tx:1139129604')
})

test('wy remote track also resolves through builtin lyric provider path', async () => {
  const requestedTracks: unknown[] = []
  const fetchLyricTextBundle = createFetchLyricTextBundle({
    readCachedLyricPayload: async () => null,
    writeLyricPayload: () => {},
    getBuiltinTrackLyric: async track => {
      requestedTracks.push(track)
      return {
        lyric: '[00:00.00]七里香',
      }
    },
  })

  const result = await fetchLyricTextBundle(
    186843,
    createRemoteTrack({
      id: 186843,
      name: '七里香',
      artistNames: '周杰伦',
      albumName: '七里香',
      lockedPlatform: 'wy',
      lxInfo: {
        songmid: 186843,
        source: 'wy',
      },
    }) as never
  )

  assert.deepEqual(result, {
    lrc: '[00:00.00]七里香',
    tlyric: '',
    yrc: '',
  })
  assert.equal(requestedTracks.length, 1)
})

test('null builtin lyric result returns an empty bundle for remote tracks', async () => {
  const fetchLyricTextBundle = createFetchLyricTextBundle({
    readCachedLyricPayload: async () => null,
    writeLyricPayload: () => {},
    getBuiltinTrackLyric: async () => null,
  })

  const result = await fetchLyricTextBundle(
    1139129604,
    createRemoteTrack() as never
  )

  assert.deepEqual(result, {
    lrc: '',
    tlyric: '',
    yrc: '',
  })
})

test('cached lyric payload short-circuits builtin provider for the same source namespace', async () => {
  let providerCalled = false
  const fetchLyricTextBundle = createFetchLyricTextBundle({
    readCachedLyricPayload: async cacheKey => {
      assert.equal(cacheKey, 'lyrics:mg:60054701934')
      return {
        lyric: '[00:00.00]缓存歌词',
        translatedLyric: '[00:00.00]cached',
      }
    },
    writeLyricPayload: () => {},
    getBuiltinTrackLyric: async () => {
      providerCalled = true
      return { lyric: 'should not be used' }
    },
  })

  const result = await fetchLyricTextBundle(
    60054701934,
    createRemoteTrack({
      id: 60054701934,
      lockedPlatform: 'mg',
      lxInfo: {
        copyrightId: '60054701934',
        source: 'mg',
      },
    }) as never
  )

  assert.deepEqual(result, {
    lrc: '[00:00.00]缓存歌词',
    tlyric: '',
    yrc: '',
  })
  assert.equal(providerCalled, false)
})

test('local track flow remains unchanged and bypasses builtin provider resolution', async () => {
  let providerCalled = false
  let localMatchCalled = false
  const fetchLyricTextBundle = createFetchLyricTextBundle({
    readCachedLyricPayload: async () => null,
    writeLyricPayload: () => {},
    getBuiltinTrackLyric: async () => {
      providerCalled = true
      return { lyric: 'should not be used' }
    },
    matchOnlineLocalTrackMetadata: async (_track, fallbackBundle) => {
      localMatchCalled = true
      return fallbackBundle
    },
  })

  const result = await fetchLyricTextBundle(-7, createLocalTrack() as never)

  assert.deepEqual(result, {
    lrc: '[00:01.00]Local lyric',
    tlyric: '[00:01.00]本地歌词',
    yrc: '',
  })
  assert.equal(providerCalled, false)
  assert.equal(localMatchCalled, true)
})
