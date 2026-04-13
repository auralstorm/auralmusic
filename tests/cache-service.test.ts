import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { CacheService } from '../src/main/cache/cache-service.ts'

const MB = 1024 * 1024

function createNowSequence(start = 1_000) {
  let current = start
  return () => {
    current += 1
    return current
  }
}

test('CacheService resolves default cache directory when config dir is empty', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-cache-test-'))
  const service = new CacheService({
    defaultRootDir: root,
    now: createNowSequence(),
  })

  assert.equal(service.resolveCacheRoot(''), root)
  assert.equal(service.resolveCacheRoot('   '), root)
  assert.equal(
    service.resolveCacheRoot(path.join(root, 'custom-dir')),
    path.join(root, 'custom-dir')
  )

  await rm(root, { recursive: true, force: true })
})

test('CacheService returns the original audio url on first fetch and reuses local file later', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-cache-test-'))
  let fetchCount = 0
  const service = new CacheService({
    defaultRootDir: root,
    now: createNowSequence(),
    fetcher: async () => {
      fetchCount += 1
      return new Response(Buffer.from('audio-binary'), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      })
    },
  })

  const first = await service.resolveAudioSource({
    cacheKey: 'song-1',
    sourceUrl: 'https://cdn.example.com/song-1.mp3',
    enabled: true,
    cacheDir: '',
    maxBytes: MB,
  })
  assert.equal(first.fromCache, false)
  assert.equal(first.url, 'https://cdn.example.com/song-1.mp3')
  assert.equal(fetchCount, 1)

  const second = await service.resolveAudioSource({
    cacheKey: 'song-1',
    sourceUrl: 'https://cdn.example.com/song-1.mp3',
    enabled: true,
    cacheDir: '',
    maxBytes: MB,
  })
  assert.equal(second.fromCache, true)
  assert.ok(second.url.startsWith('file:///'))
  assert.equal(fetchCount, 1)

  await rm(root, { recursive: true, force: true })
})

test('CacheService evicts least recently used entries when size exceeds limit', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-cache-test-'))
  let fetchCount = 0
  const payloadByUrl = new Map([
    ['https://cdn.example.com/a.mp3', Buffer.from('aaaaa')],
    ['https://cdn.example.com/b.mp3', Buffer.from('bbbbb')],
    ['https://cdn.example.com/c.mp3', Buffer.from('ccccc')],
  ])
  const service = new CacheService({
    defaultRootDir: root,
    now: createNowSequence(),
    fetcher: async (input: URL | RequestInfo) => {
      fetchCount += 1
      const url = typeof input === 'string' ? input : input.toString()
      const payload = payloadByUrl.get(url)
      if (!payload) {
        return new Response('not found', { status: 404 })
      }

      return new Response(payload, {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      })
    },
  })

  await service.resolveAudioSource({
    cacheKey: 'a',
    sourceUrl: 'https://cdn.example.com/a.mp3',
    enabled: true,
    cacheDir: '',
    maxBytes: 10,
  })
  await service.resolveAudioSource({
    cacheKey: 'b',
    sourceUrl: 'https://cdn.example.com/b.mp3',
    enabled: true,
    cacheDir: '',
    maxBytes: 10,
  })
  await service.resolveAudioSource({
    cacheKey: 'c',
    sourceUrl: 'https://cdn.example.com/c.mp3',
    enabled: true,
    cacheDir: '',
    maxBytes: 10,
  })

  const cachedB = await service.resolveAudioSource({
    cacheKey: 'b',
    sourceUrl: 'https://cdn.example.com/b.mp3',
    enabled: true,
    cacheDir: '',
    maxBytes: 10,
  })

  const evictedA = await service.resolveAudioSource({
    cacheKey: 'a',
    sourceUrl: 'https://cdn.example.com/a.mp3',
    enabled: true,
    cacheDir: '',
    maxBytes: 10,
  })

  assert.equal(cachedB.fromCache, true)
  assert.ok(cachedB.url.startsWith('file:///'))
  assert.equal(evictedA.fromCache, false)
  assert.equal(evictedA.url, 'https://cdn.example.com/a.mp3')
  assert.equal(fetchCount, 4)

  await rm(root, { recursive: true, force: true })
})

test('CacheService reads and writes lyrics payload', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-cache-test-'))
  const service = new CacheService({
    defaultRootDir: root,
    now: createNowSequence(),
  })

  const payload = JSON.stringify({
    lyric: '[00:00.00]line',
    tlyric: '[00:00.00]翻译',
  })
  await service.writeLyricsPayload({
    cacheKey: 'lyric-1',
    payload,
    enabled: true,
    cacheDir: '',
    maxBytes: MB,
  })

  const cached = await service.readLyricsPayload({
    cacheKey: 'lyric-1',
    enabled: true,
    cacheDir: '',
  })
  assert.equal(cached, payload)

  await rm(root, { recursive: true, force: true })
})

test('CacheService reports cache status and prunes missing entries', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-cache-test-'))
  const audioPayload = Buffer.from('audio-status')
  const lyricsPayload = '{"lyric":"line"}'
  const service = new CacheService({
    defaultRootDir: root,
    now: createNowSequence(),
    fetcher: async () =>
      new Response(audioPayload, {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      }),
  })

  await service.resolveAudioSource({
    cacheKey: 'status-song',
    sourceUrl: 'https://cdn.example.com/status-song.mp3',
    enabled: true,
    cacheDir: '',
    maxBytes: MB,
  })
  await service.writeLyricsPayload({
    cacheKey: 'status-lyrics',
    payload: lyricsPayload,
    enabled: true,
    cacheDir: '',
    maxBytes: MB,
  })

  const initialStatus = await service.getStatus({ cacheDir: '' })
  assert.deepEqual(initialStatus, {
    usedBytes:
      audioPayload.byteLength + Buffer.byteLength(lyricsPayload, 'utf8'),
    audioCount: 1,
    lyricsCount: 1,
  })

  await rm(path.join(root, 'audio'), { recursive: true, force: true })

  const prunedStatus = await service.getStatus({ cacheDir: '' })
  assert.deepEqual(prunedStatus, {
    usedBytes: Buffer.byteLength(lyricsPayload, 'utf8'),
    audioCount: 0,
    lyricsCount: 1,
  })

  await rm(root, { recursive: true, force: true })
})

test('CacheService clear removes cached files and index', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-cache-test-'))
  const service = new CacheService({
    defaultRootDir: root,
    now: createNowSequence(),
    fetcher: async () =>
      new Response(Buffer.from('audio'), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      }),
  })

  await service.resolveAudioSource({
    cacheKey: 'song',
    sourceUrl: 'https://cdn.example.com/song.mp3',
    enabled: true,
    cacheDir: '',
    maxBytes: MB,
  })
  await service.writeLyricsPayload({
    cacheKey: 'lyric',
    payload: '{"lyric":"line"}',
    enabled: true,
    cacheDir: '',
    maxBytes: MB,
  })

  await service.clear({
    cacheDir: '',
  })

  await assert.rejects(
    () => stat(path.join(root, 'index.json')),
    /ENOENT|no such file/i
  )
  await assert.rejects(
    () => readFile(path.join(root, 'audio'), 'utf8'),
    /EISDIR|is a directory|ENOENT|no such file/i
  )
  await assert.rejects(
    () => readFile(path.join(root, 'lyrics'), 'utf8'),
    /EISDIR|is a directory|ENOENT|no such file/i
  )

  await rm(root, { recursive: true, force: true })
})
