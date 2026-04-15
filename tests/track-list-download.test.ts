import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildTrackDownloadContext,
  handleTrackDownload,
  TRACK_DOWNLOAD_TOASTS,
  type TrackListDownloadSong,
} from '../src/renderer/components/TrackList/track-list-download.model.ts'

test('buildTrackDownloadContext keeps the minimal download payload', () => {
  const item: TrackListDownloadSong = {
    id: 42,
    name: 'Into the Night',
    artists: [{ name: 'Yoru' }],
    duration: 180000,
    albumName: 'Demo',
  }

  assert.deepEqual(buildTrackDownloadContext(item, 'fallback-cover.jpg'), {
    songId: 42,
    songName: 'Into the Night',
    artistName: 'Yoru',
    coverUrl: 'fallback-cover.jpg',
    albumName: 'Demo',
    requestedQuality: 'higher',
  })
})

test('handleTrackDownload stops when download is disabled', async () => {
  let enqueued = false
  let toastMessage = ''

  const result = await handleTrackDownload({
    item: {
      id: 7,
      name: 'No Download',
      duration: 0,
    },
    downloadEnabled: false,
    coverUrl: 'cover.jpg',
    enqueueSongDownload: async () => {
      enqueued = true
    },
    toastError: message => {
      toastMessage = message
    },
  })

  assert.equal(result, false)
  assert.equal(enqueued, false)
  assert.equal(toastMessage, TRACK_DOWNLOAD_TOASTS.disabled)
})

test('handleTrackDownload enqueues the song when download is enabled', async () => {
  let receivedContext:
    | {
        songId: number
        songName: string
        artistName: string
        coverUrl: string
        albumName?: string
        requestedQuality: string
        sourceUrl?: string
        resolvedQuality?: string
        sourceProvider?: string
        fileExtension?: string | null
      }
    | undefined

  const result = await handleTrackDownload({
    item: {
      id: 8,
      name: 'Download Me',
      artistNames: 'Singer A',
      duration: 0,
    },
    downloadEnabled: true,
    coverUrl: '',
    resolveDownloadSource: async input => {
      assert.deepEqual(input.track, {
        id: 8,
        name: 'Download Me',
        artistNames: 'Singer A',
        albumName: '',
        coverUrl: '',
        duration: 0,
      })
      assert.equal(input.requestedQuality, 'higher')
      assert.equal(input.policy, 'fallback')

      return {
        url: 'https://cdn.example.com/download-me.flac',
        quality: 'lossless',
        provider: 'official-download',
        fileExtension: '.flac',
      }
    },
    enqueueSongDownload: async context => {
      receivedContext = context
    },
    toastError: () => undefined,
  })

  assert.equal(result, true)
  assert.deepEqual(receivedContext, {
    songId: 8,
    songName: 'Download Me',
    artistName: 'Singer A',
    coverUrl: '',
    albumName: undefined,
    requestedQuality: 'higher',
    sourceUrl: 'https://cdn.example.com/download-me.flac',
    resolvedQuality: 'lossless',
    sourceProvider: 'official-download',
    fileExtension: '.flac',
  })
})
