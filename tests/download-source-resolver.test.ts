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
      return { data: { data: [{ id: 1, url: '' }] } }
    },
    getSongDownloadUrlV1: async params => {
      calls.push(`song-download:${params.level}`)
      return { data: { data: { url: '' } } }
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
    fileExtension: null,
  })
  assert.deepEqual(calls, [
    'song-download:lossless',
    'song-url:lossless:false',
    'song-url:lossless:true',
    'lx',
  ])
})
