import assert from 'node:assert/strict'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { PlaybackTempCacheService } from '../src/main/cache/playback-temp-cache-service.ts'

test('PlaybackTempCacheService stores audio outside user cache without an index file', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-temp-cache-test-'))
  let fetchCount = 0
  const service = new PlaybackTempCacheService({
    defaultRootDir: root,
    fetcher: async () => {
      fetchCount += 1
      return new Response(Buffer.from('temp-audio'), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      })
    },
  })

  const first = await service.resolveAudioSource({
    cacheKey: 'song-temp',
    sourceUrl: 'https://cdn.example.com/song-temp.mp3',
  })
  const second = await service.resolveAudioSource({
    cacheKey: 'song-temp',
    sourceUrl: 'https://cdn.example.com/song-temp.mp3',
  })

  assert.equal(first.fromCache, true)
  assert.equal(second.fromCache, true)
  assert.ok(first.url.startsWith('auralmusic-media://'))
  assert.equal(first.url, second.url)
  assert.equal(fetchCount, 1)

  const files = await readdir(path.join(root, 'audio'))
  assert.equal(files.length, 1)
  await assert.rejects(
    () => readdir(path.join(root, 'index.json')),
    /ENOENT|not found|no such file/i
  )

  await rm(root, { recursive: true, force: true })
})

test('PlaybackTempCacheService clears temporary playback files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-temp-cache-test-'))
  const service = new PlaybackTempCacheService({
    defaultRootDir: root,
    fetcher: async () =>
      new Response(Buffer.from('temp-audio'), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      }),
  })

  await service.resolveAudioSource({
    cacheKey: 'song-temp',
    sourceUrl: 'https://cdn.example.com/song-temp.mp3',
  })
  await service.clear()

  const files = await readdir(path.join(root, 'audio'))
  assert.equal(files.length, 0)

  await rm(root, { recursive: true, force: true })
})
