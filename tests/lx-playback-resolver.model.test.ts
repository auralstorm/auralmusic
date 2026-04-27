import test from 'node:test'
import assert from 'node:assert/strict'

import type { PlaybackTrack } from '../src/shared/playback.ts'
import {
  formatLxInterval,
  resolveLxPlaybackScriptCandidates,
  selectBestLxSource,
  toLxMusicInfo,
} from '../src/renderer/services/music-source/lx-playback-resolver.ts'

const track: PlaybackTrack = {
  id: 1001,
  name: 'Example Song',
  artistNames: 'Artist A / Artist B',
  albumName: 'Example Album',
  coverUrl: 'https://image.test/cover.jpg',
  duration: 61000,
}

test('formatLxInterval renders mm:ss from milliseconds', () => {
  assert.equal(formatLxInterval(0), '00:00')
  assert.equal(formatLxInterval(61000), '01:01')
  assert.equal(formatLxInterval(3599000), '59:59')
})

test('toLxMusicInfo maps playback tracks into lx music info', () => {
  assert.deepEqual(toLxMusicInfo(track), {
    songmid: 1001,
    hash: '1001',
    strMediaMid: '1001',
    copyrightId: '1001',
    name: 'Example Song',
    singer: 'Artist A / Artist B',
    album: 'Example Album',
    albumId: undefined,
    source: 'wy',
    interval: '01:01',
    img: 'https://image.test/cover.jpg',
  })
})

test('toLxMusicInfo prefers the locked platform when present', () => {
  assert.deepEqual(
    toLxMusicInfo({
      ...track,
      lockedPlatform: 'tx',
    }),
    {
      songmid: 1001,
      hash: '1001',
      strMediaMid: '1001',
      copyrightId: '1001',
      name: 'Example Song',
      singer: 'Artist A / Artist B',
      album: 'Example Album',
      albumId: undefined,
      source: 'tx',
      interval: '01:01',
      img: 'https://image.test/cover.jpg',
    }
  )
})

test('toLxMusicInfo prefers a locked lx source id over the legacy locked platform', () => {
  assert.deepEqual(
    toLxMusicInfo({
      ...track,
      lockedPlatform: 'tx',
      lockedLxSourceId: 'qsvip',
    }),
    {
      songmid: 1001,
      hash: '1001',
      strMediaMid: '1001',
      copyrightId: '1001',
      name: 'Example Song',
      singer: 'Artist A / Artist B',
      album: 'Example Album',
      albumId: undefined,
      source: 'qsvip',
      interval: '01:01',
      img: 'https://image.test/cover.jpg',
    }
  )
})

test('toLxMusicInfo uses platform identifiers instead of synthetic numeric hash for QQ tracks', () => {
  const musicInfo = toLxMusicInfo({
    ...track,
    id: 108785412,
    lockedPlatform: 'tx',
    lxInfo: {
      songmid: '002miT7m22Yka9',
      strMediaMid: '000gUHG33iuJPS',
      source: 'tx',
    },
  })

  assert.equal(musicInfo.source, 'tx')
  assert.equal(musicInfo.songmid, '002miT7m22Yka9')
  assert.equal(musicInfo.hash, '002miT7m22Yka9')
  assert.equal(musicInfo.strMediaMid, '000gUHG33iuJPS')
})

test('toLxMusicInfo uses migu copyright id as hash when available', () => {
  const musicInfo = toLxMusicInfo({
    ...track,
    id: 807791,
    lockedPlatform: 'mg',
    lxInfo: {
      songmid: '807791',
      copyrightId: '63480214121',
      source: 'mg',
    },
  })

  assert.equal(musicInfo.source, 'mg')
  assert.equal(musicInfo.songmid, '807791')
  assert.equal(musicInfo.hash, '63480214121')
  assert.equal(musicInfo.copyrightId, '63480214121')
})

test('selectBestLxSource prefers music info source before generic fallbacks', () => {
  assert.equal(
    selectBestLxSource(
      {
        mg: {
          name: 'Migu',
          type: 'music',
          actions: ['musicUrl'],
          qualitys: ['128k'],
        },
        wy: {
          name: 'NetEase',
          type: 'music',
          actions: ['musicUrl'],
          qualitys: ['320k'],
        },
      },
      ['wy', 'kw', 'kg', 'tx', 'mg']
    ),
    'wy'
  )

  assert.equal(
    selectBestLxSource({
      kg: {
        name: 'Kugou',
        type: 'music',
        actions: ['musicUrl'],
        qualitys: ['128k'],
      },
    }),
    'kg'
  )

  assert.equal(selectBestLxSource({}), null)
})

test('selectBestLxSource ignores sources that cannot resolve music urls', () => {
  assert.equal(
    selectBestLxSource({
      kw: {
        name: 'Kuwo',
        type: 'music',
        actions: ['lyric'],
        qualitys: ['320k'],
      },
      mg: {
        name: 'Migu',
        type: 'music',
        actions: ['musicUrl'],
        qualitys: ['320k'],
      },
    }),
    'mg'
  )
})

test('resolveLxPlaybackScriptCandidates keeps active and source-matched scripts first', () => {
  const scripts = [
    { id: 'active', name: 'Active', fileName: 'a.js', sources: ['tx'] },
    { id: 'wy-only', name: 'WY', fileName: 'wy.js', sources: ['wy'] },
    { id: 'tx-backup', name: 'TX Backup', fileName: 'tx.js', sources: ['tx'] },
    { id: 'unknown', name: 'Unknown', fileName: 'unknown.js' },
  ]

  assert.deepEqual(
    resolveLxPlaybackScriptCandidates({
      scripts,
      activeScriptId: 'active',
      preferredSource: 'tx',
    }).map(script => script.id),
    ['active', 'tx-backup', 'unknown', 'wy-only']
  )
})

test('resolveLxPlaybackScriptCandidates still tries active script even without source metadata', () => {
  const scripts = [
    { id: 'active', name: 'Active', fileName: 'a.js' },
    { id: 'backup', name: 'Backup', fileName: 'b.js', sources: ['tx'] },
  ]

  assert.deepEqual(
    resolveLxPlaybackScriptCandidates({
      scripts,
      activeScriptId: 'active',
      preferredSource: 'tx',
    }).map(script => script.id),
    ['active', 'backup']
  )
})
