import assert from 'node:assert/strict'
import test from 'node:test'

import { createDownloadSourceResolver } from '../src/main/download/download-source-resolver.ts'

test('main download fallback tries builtin-unblock before official when unauthenticated', async () => {
  const attemptedUrls: string[] = []
  const resolveDownloadSource = createDownloadSourceResolver({
    readBaseUrl: () => 'https://music.example.com',
    getAuthSession: () => null,
    fetcher: async input => {
      const url = typeof input === 'string' ? input : input.toString()
      attemptedUrls.push(url)

      if (url.includes('/song/url/v1') && url.includes('unblock=true')) {
        return Response.json({
          data: [{ id: 1, url: 'https://cdn.example.com/unblock.mp3' }],
        })
      }

      if (url.includes('/song/download/url/v1')) {
        return Response.json({
          data: { url: 'https://cdn.example.com/official.flac' },
        })
      }

      return Response.json({ data: [{ id: 1, url: '' }] })
    },
  })

  const result = await resolveDownloadSource({
    payload: {
      songId: '1',
      songName: 'Song',
      artistName: 'Artist',
      requestedQuality: 'higher',
    },
    quality: 'higher',
    runtimeConfig: {
      musicSourceEnabled: true,
      musicSourceProviders: ['migu'],
      luoxueSourceEnabled: false,
      customMusicApiEnabled: false,
      customMusicApiUrl: '',
      downloadDir: '',
      downloadQuality: 'higher',
      downloadQualityPolicy: 'fallback',
      downloadSkipExisting: true,
      downloadConcurrency: 3,
      downloadFileNamePattern: 'song-artist',
      downloadEmbedCover: true,
      downloadEmbedLyrics: true,
      downloadEmbedTranslatedLyrics: false,
    },
  })

  assert.equal(result?.url, 'https://cdn.example.com/unblock.mp3')
  assert.deepEqual(attemptedUrls, [
    'https://music.example.com/song/url/v1?id=1&level=higher&unblock=true',
  ])
})

test('main download fallback still tries builtin-unblock when legacy builtin providers are empty', async () => {
  const attemptedUrls: string[] = []
  const resolveDownloadSource = createDownloadSourceResolver({
    readBaseUrl: () => 'https://music.example.com',
    getAuthSession: () => null,
    fetcher: async input => {
      const url = typeof input === 'string' ? input : input.toString()
      attemptedUrls.push(url)

      if (url.includes('/song/url/v1') && url.includes('unblock=true')) {
        return Response.json({
          data: [{ id: 1, url: 'https://cdn.example.com/unblock.mp3' }],
        })
      }

      return Response.json({ data: [{ id: 1, url: '' }] })
    },
  })

  const result = await resolveDownloadSource({
    payload: {
      songId: '1',
      songName: 'Song',
      artistName: 'Artist',
      requestedQuality: 'higher',
    },
    quality: 'higher',
    runtimeConfig: {
      musicSourceEnabled: true,
      musicSourceProviders: ['lxMusic'],
      luoxueSourceEnabled: false,
      customMusicApiEnabled: false,
      customMusicApiUrl: '',
      downloadDir: '',
      downloadQuality: 'higher',
      downloadQualityPolicy: 'fallback',
      downloadSkipExisting: true,
      downloadConcurrency: 3,
      downloadFileNamePattern: 'song-artist',
      downloadEmbedCover: true,
      downloadEmbedLyrics: true,
      downloadEmbedTranslatedLyrics: false,
    },
  })

  assert.equal(result?.url, 'https://cdn.example.com/unblock.mp3')
  assert.deepEqual(attemptedUrls, [
    'https://music.example.com/song/url/v1?id=1&level=higher&unblock=true',
  ])
})

test('main download fallback does not resolve non-wy locked tracks through official api', async () => {
  const attemptedUrls: string[] = []
  const resolveDownloadSource = createDownloadSourceResolver({
    readBaseUrl: () => 'https://music.example.com',
    getAuthSession: () => ({ userId: 1, cookie: 'MUSIC_U=token', isVip: true }),
    fetcher: async input => {
      const url = typeof input === 'string' ? input : input.toString()
      attemptedUrls.push(url)
      return Response.json({
        data: { url: 'https://cdn.example.com/official.flac' },
      })
    },
  })

  const result = await resolveDownloadSource({
    payload: {
      songId: 'tx-mid',
      songName: 'Tencent Song',
      artistName: 'Artist',
      requestedQuality: 'higher',
      lockedPlatform: 'tx',
    },
    quality: 'higher',
    runtimeConfig: {
      musicSourceEnabled: true,
      musicSourceProviders: ['lxMusic'],
      luoxueSourceEnabled: true,
      customMusicApiEnabled: false,
      customMusicApiUrl: '',
      downloadDir: '',
      downloadQuality: 'higher',
      downloadQualityPolicy: 'fallback',
      downloadSkipExisting: true,
      downloadConcurrency: 3,
      downloadFileNamePattern: 'song-artist',
      downloadEmbedCover: true,
      downloadEmbedLyrics: true,
      downloadEmbedTranslatedLyrics: false,
    },
  })

  assert.equal(result, null)
  assert.deepEqual(attemptedUrls, [])
})
