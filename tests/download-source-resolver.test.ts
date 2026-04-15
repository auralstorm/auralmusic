import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createDownloadSourceResolver,
  type DownloadSourceResolverDeps,
} from '../src/renderer/services/download/download-source-resolver.ts'

test('createDownloadSourceResolver falls back from official endpoints to LX and returns effective quality', async () => {
  const calls: string[] = []

  const deps: DownloadSourceResolverDeps = {
    getSongUrlV1: async params => {
      calls.push(`song-url:${params.level}:${params.unblock}`)
      throw new Error('playback unavailable')
    },
    getSongDownloadUrlV1: async params => {
      calls.push(`song-download:${params.level}`)
      throw new Error('download unavailable')
    },
    resolveTrackWithLxMusicSource: async () => {
      calls.push('lx')
      return {
        id: 1,
        url: 'https://cdn.example.com/full.flac',
        time: 200000,
        br: 0,
      }
    },
    getConfig: () => ({
      quality: 'lossless',
      musicSourceEnabled: true,
      luoxueSourceEnabled: true,
      musicSourceProviders: ['lxMusic'],
      activeLuoxueMusicSourceScriptId: 'script-1',
      luoxueMusicSourceScripts: [{ id: 'script-1' }] as never,
    }),
  }

  const resolveDownloadSource = createDownloadSourceResolver(deps)
  const result = await resolveDownloadSource({
    track: {
      id: 1,
      name: 'Test Song',
      artistNames: 'Artist',
      albumName: 'Album',
      coverUrl: '',
      duration: 200000,
    },
    requestedQuality: 'lossless',
    policy: 'fallback',
  })

  assert.deepEqual(result, {
    url: 'https://cdn.example.com/full.flac',
    quality: 'lossless',
    provider: 'lxMusic',
    fileExtension: '.flac',
  })
  assert.deepEqual(calls, [
    'song-download:lossless',
    'song-url:lossless:false',
    'song-url:lossless:true',
    'lx',
  ])
})

test('createDownloadSourceResolver returns official playback when download is empty', async () => {
  const calls: string[] = []

  const deps: DownloadSourceResolverDeps = {
    getSongDownloadUrlV1: async params => {
      calls.push(`song-download:${params.level}`)
      return { data: { data: { url: '' } } }
    },
    getSongUrlV1: async params => {
      calls.push(`song-url:${params.level}:${params.unblock}`)
      return {
        data: { data: [{ id: 2, url: 'https://cdn.example.com/track.mp3' }] },
      }
    },
    resolveTrackWithLxMusicSource: async () => {
      calls.push('lx')
      return null
    },
    getConfig: () => ({
      quality: 'higher',
      musicSourceEnabled: true,
      luoxueSourceEnabled: true,
      musicSourceProviders: ['lxMusic'],
      activeLuoxueMusicSourceScriptId: 'script-1',
      luoxueMusicSourceScripts: [{ id: 'script-1' }] as never,
    }),
  }

  const resolveDownloadSource = createDownloadSourceResolver(deps)
  const result = await resolveDownloadSource({
    track: {
      id: 3,
      name: 'Playback Song',
      artistNames: 'Artist',
      albumName: 'Album',
      coverUrl: '',
      duration: 180000,
    },
    requestedQuality: 'higher',
    policy: 'fallback',
  })

  assert.deepEqual(result, {
    url: 'https://cdn.example.com/track.mp3',
    quality: 'higher',
    provider: 'official-playback',
    fileExtension: '.mp3',
  })
  assert.deepEqual(calls, ['song-download:higher', 'song-url:higher:false'])
})

test('createDownloadSourceResolver derives extension from official download payload', async () => {
  const deps: DownloadSourceResolverDeps = {
    getSongDownloadUrlV1: async params => {
      assert.equal(params.level, 'higher')
      assert.equal(params.id, 2)

      return {
        data: {
          data: {
            url: 'https://cdn.example.com/official-track',
            encodeType: 'flac24bit',
          },
        },
      }
    },
    getSongUrlV1: async () => {
      throw new Error('playback fallback should not run')
    },
    resolveTrackWithLxMusicSource: async () => {
      throw new Error('lx fallback should not run')
    },
    getConfig: () => ({
      quality: 'lossless',
      musicSourceEnabled: true,
      luoxueSourceEnabled: true,
      musicSourceProviders: ['lxMusic'],
      activeLuoxueMusicSourceScriptId: 'script-1',
      luoxueMusicSourceScripts: [{ id: 'script-1' }] as never,
    }),
  }

  const resolveDownloadSource = createDownloadSourceResolver(deps)
  const result = await resolveDownloadSource({
    track: {
      id: 2,
      name: 'Official Song',
      artistNames: 'Artist',
      albumName: 'Album',
      coverUrl: '',
      duration: 180000,
    },
    requestedQuality: 'higher',
    policy: 'fallback',
  })

  assert.deepEqual(result, {
    url: 'https://cdn.example.com/official-track',
    quality: 'higher',
    provider: 'official-download',
    fileExtension: '.flac',
  })
})
