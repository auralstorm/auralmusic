import assert from 'node:assert/strict'
import test from 'node:test'

import {
  handleTrackDownload,
  TRACK_DOWNLOAD_TOASTS,
} from '../src/renderer/components/TrackList/track-list-download.model.ts'

test('handleTrackDownload resolves source before enqueueing and forwards resolved fields', async () => {
  let resolvedInput:
    | {
        track: {
          id: number
          name: string
          artistNames: string
          albumName: string
          coverUrl: string
          duration: number
          fee?: number
          lockedPlatform?: string
          lxInfo?: {
            songmid?: string | number
            source?: string
          }
        }
        requestedQuality: string
        policy: string
      }
    | undefined
  let enqueuedPayload:
    | {
        songId: number
        songName: string
        artistName: string
        coverUrl: string
        albumName?: string
        fee?: number
        requestedQuality: string
        sourceUrl?: string
        resolvedQuality?: string
        sourceProvider?: string
        fileExtension?: string | null
        downloadQualityPolicy?: string
        lockedPlatform?: string
        lxInfo?: {
          songmid?: string | number
          source?: string
        }
      }
    | undefined
  let toastMessage = ''

  const result = await handleTrackDownload({
    item: {
      id: 8,
      name: 'Download Me',
      artistNames: 'Singer A',
      duration: 0,
      albumName: 'Album',
      lockedPlatform: 'tx',
      lxInfo: {
        songmid: 'tx-mid',
        source: 'tx',
      },
    },
    coverUrl: 'fallback-cover.jpg',
    downloadEnabled: true,
    downloadQualityPolicy: 'fallback',
    resolveDownloadSource: async input => {
      resolvedInput = input
      return {
        url: 'https://cdn.example.com/track.flac',
        quality: 'lossless',
        provider: 'official-download',
        fileExtension: '.flac',
      }
    },
    enqueueSongDownload: async payload => {
      enqueuedPayload = payload
    },
    toastError: message => {
      toastMessage = message
    },
  })

  assert.equal(result, true)
  assert.deepEqual(resolvedInput, {
    track: {
      id: 8,
      name: 'Download Me',
      artistNames: 'Singer A',
      albumName: 'Album',
      coverUrl: 'fallback-cover.jpg',
      duration: 0,
      fee: 0,
      lockedPlatform: 'tx',
      lxInfo: {
        songmid: 'tx-mid',
        source: 'tx',
      },
    },
    requestedQuality: 'higher',
    policy: 'fallback',
  })
  assert.deepEqual(enqueuedPayload, {
    songId: 8,
    songName: 'Download Me',
    artistName: 'Singer A',
    fee: 0,
    coverUrl: 'fallback-cover.jpg',
    albumName: 'Album',
    requestedQuality: 'higher',
    lockedPlatform: 'tx',
    lxInfo: {
      songmid: 'tx-mid',
      source: 'tx',
    },
    sourceUrl: 'https://cdn.example.com/track.flac',
    resolvedQuality: 'lossless',
    sourceProvider: 'official-download',
    fileExtension: '.flac',
    downloadQualityPolicy: 'fallback',
  })
  assert.equal(toastMessage, '')
})

test('handleTrackDownload forwards the requested download quality policy', async () => {
  let resolvedInput:
    | {
        requestedQuality: string
        policy: string
      }
    | undefined
  let enqueuedPayload:
    | {
        requestedQuality: string
        downloadQualityPolicy?: string
      }
    | undefined

  const result = await handleTrackDownload({
    item: {
      id: 18,
      name: 'Strict Download',
      artistNames: 'Singer B',
      duration: 2_000,
    },
    requestedQuality: 'lossless',
    downloadEnabled: true,
    downloadQualityPolicy: 'strict',
    resolveDownloadSource: async input => {
      resolvedInput = {
        requestedQuality: input.requestedQuality,
        policy: input.policy,
      }

      return {
        url: 'https://cdn.example.com/strict.flac',
        quality: 'lossless',
        provider: 'official-download',
        fileExtension: '.flac',
      }
    },
    enqueueSongDownload: async payload => {
      enqueuedPayload = {
        requestedQuality: payload.requestedQuality,
        downloadQualityPolicy: payload.downloadQualityPolicy,
      }
    },
    toastError: () => undefined,
  })

  assert.equal(result, true)
  assert.deepEqual(resolvedInput, {
    requestedQuality: 'lossless',
    policy: 'strict',
  })
  assert.deepEqual(enqueuedPayload, {
    requestedQuality: 'lossless',
    downloadQualityPolicy: 'strict',
  })
})

test('handleTrackDownload stops when source resolution fails', async () => {
  let enqueued = false
  let toastMessage = ''

  const result = await handleTrackDownload({
    item: {
      id: 7,
      name: 'No Download',
      duration: 0,
    },
    downloadEnabled: true,
    resolveDownloadSource: async () => null,
    enqueueSongDownload: async () => {
      enqueued = true
    },
    toastError: message => {
      toastMessage = message
    },
  })

  assert.equal(result, false)
  assert.equal(enqueued, false)
  assert.equal(toastMessage, TRACK_DOWNLOAD_TOASTS.sourceResolutionFailed)
})

test('handleTrackDownload stops when source resolution rejects', async () => {
  let enqueued = false
  let toastMessage = ''

  const result = await handleTrackDownload({
    item: {
      id: 7,
      name: 'No Download',
      duration: 0,
    },
    downloadEnabled: true,
    resolveDownloadSource: async () => {
      throw new Error('resolver failed')
    },
    enqueueSongDownload: async () => {
      enqueued = true
    },
    toastError: message => {
      toastMessage = message
    },
  })

  assert.equal(result, false)
  assert.equal(enqueued, false)
  assert.equal(toastMessage, TRACK_DOWNLOAD_TOASTS.sourceResolutionFailed)
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
