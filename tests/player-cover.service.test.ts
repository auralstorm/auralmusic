import assert from 'node:assert/strict'
import test from 'node:test'

import { createEnsureCurrentTrackCover } from '../src/renderer/components/PlayerScene/player-cover.service.ts'

function createRemoteTrack(overrides: Record<string, unknown> = {}) {
  return {
    id: 156483846,
    name: '晴天',
    artistNames: '周杰伦',
    albumName: '叶惠美',
    coverUrl: '',
    duration: 260000,
    lockedPlatform: 'kw',
    lxInfo: {
      songmid: '156483846',
      source: 'kw',
    },
    ...overrides,
  }
}

function createLocalTrack(overrides: Record<string, unknown> = {}) {
  return createRemoteTrack({
    id: -1,
    sourceUrl:
      'auralmusic-media://local-file?path=F%3A%5Cdownloads%5Clocal.mp3',
    ...overrides,
  })
}

test('missing remote cover resolves through builtin provider and patches playback metadata', async () => {
  const patched: Array<{ trackId: number; coverUrl: string }> = []
  const requestedTracks: unknown[] = []
  const ensureCurrentTrackCover = createEnsureCurrentTrackCover({
    missCache: new Set(),
    getBuiltinTrackCover: async track => {
      requestedTracks.push(track)
      return { coverUrl: 'https://img.example.com/kw.jpg' }
    },
    patchTrackCover: (trackId, coverUrl) => {
      patched.push({ trackId, coverUrl })
    },
  })

  await ensureCurrentTrackCover(createRemoteTrack() as never)

  assert.equal(requestedTracks.length, 1)
  assert.deepEqual(patched, [
    { trackId: 156483846, coverUrl: 'https://img.example.com/kw.jpg' },
  ])
})

test('tracks with existing covers do not request builtin cover provider', async () => {
  let providerCalled = false
  const ensureCurrentTrackCover = createEnsureCurrentTrackCover({
    missCache: new Set(),
    getBuiltinTrackCover: async () => {
      providerCalled = true
      return { coverUrl: 'https://img.example.com/unused.jpg' }
    },
    patchTrackCover: () => {},
  })

  await ensureCurrentTrackCover(
    createRemoteTrack({
      coverUrl: 'https://img.example.com/existing.jpg',
    }) as never
  )

  assert.equal(providerCalled, false)
})

test('local tracks do not request builtin cover provider', async () => {
  let providerCalled = false
  const ensureCurrentTrackCover = createEnsureCurrentTrackCover({
    missCache: new Set(),
    getBuiltinTrackCover: async () => {
      providerCalled = true
      return { coverUrl: 'https://img.example.com/unused.jpg' }
    },
    patchTrackCover: () => {},
  })

  await ensureCurrentTrackCover(createLocalTrack() as never)

  assert.equal(providerCalled, false)
})

test('cover misses are cached to avoid repeated provider requests', async () => {
  let providerCallCount = 0
  const ensureCurrentTrackCover = createEnsureCurrentTrackCover({
    missCache: new Set(),
    getBuiltinTrackCover: async () => {
      providerCallCount += 1
      return null
    },
    patchTrackCover: () => {},
  })
  const track = createRemoteTrack() as never

  await ensureCurrentTrackCover(track)
  await ensureCurrentTrackCover(track)

  assert.equal(providerCallCount, 1)
})
