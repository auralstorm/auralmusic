import test from 'node:test'
import assert from 'node:assert/strict'

import {
  PLAYBACK_MODE_SEQUENCE,
  createAlbumQueueSourceKey,
  createCloudQueueSourceKey,
  createLikedSongsQueueSourceKey,
  createPlaylistQueueSourceKey,
  createShuffleOrder,
  createPlaybackQueueSnapshot,
  createSongUrlRequestAttempts,
  getPlaybackQueueItemState,
  getNextPlaybackMode,
  getNextQueueIndex,
  getPreviousQueueIndex,
  normalizeSongUrlV1Response,
  normalizePlaybackMode,
  normalizePlaybackVolume,
  resolveQueueSourceDescriptor,
  resolvePlaylistIdFromQueueSourceKey,
  resolvePlaybackQueueStep,
  type PlaybackTrack,
} from '../src/shared/playback.ts'

const tracks: PlaybackTrack[] = [
  {
    id: 1,
    name: 'Track 1',
    artistNames: 'Artist 1',
    albumName: 'Album 1',
    coverUrl: 'cover-1',
    duration: 180000,
    sourceUrl: undefined,
  },
  {
    id: 2,
    name: 'Track 2',
    artistNames: 'Artist 2',
    albumName: 'Album 2',
    coverUrl: 'cover-2',
    duration: 200000,
    sourceUrl: undefined,
  },
]

test('normalizeSongUrlV1Response reads the first playable url item', () => {
  assert.deepEqual(
    normalizeSongUrlV1Response({
      data: [
        {
          id: 1,
          url: 'https://music.example/1.mp3',
          time: 180000,
          br: 320000,
        },
      ],
    }),
    {
      id: 1,
      url: 'https://music.example/1.mp3',
      time: 180000,
      br: 320000,
    }
  )
})

test('normalizeSongUrlV1Response returns null when url is missing', () => {
  assert.equal(
    normalizeSongUrlV1Response({
      data: [{ id: 1, url: null, time: 180000, br: 320000 }],
    }),
    null
  )
  assert.equal(normalizeSongUrlV1Response({ data: [] }), null)
})

test('createSongUrlRequestAttempts requests official url first', () => {
  assert.deepEqual(createSongUrlRequestAttempts(false), [false])
  assert.deepEqual(createSongUrlRequestAttempts(true), [false, true])
})

test('createPlaybackQueueSnapshot keeps a valid queue and selected index', () => {
  assert.deepEqual(createPlaybackQueueSnapshot(tracks, 1), {
    queue: tracks,
    currentIndex: 1,
    currentTrack: tracks[1],
  })
})

test('createPlaybackQueueSnapshot filters invalid tracks and clamps the index', () => {
  assert.deepEqual(
    createPlaybackQueueSnapshot(
      [tracks[0], { ...tracks[1], id: 0 }, { ...tracks[1], name: '' }],
      99
    ),
    {
      queue: [tracks[0]],
      currentIndex: 0,
      currentTrack: tracks[0],
    }
  )
})

test('playlist queue source helpers encode and decode playlist ids safely', () => {
  assert.equal(createPlaylistQueueSourceKey(9527), 'playlist:9527')
  assert.equal(createLikedSongsQueueSourceKey(9527), 'liked-songs:9527')
  assert.equal(createAlbumQueueSourceKey(9527), 'album:9527')
  assert.equal(createCloudQueueSourceKey(9527), 'cloud:9527')
  assert.equal(resolvePlaylistIdFromQueueSourceKey('playlist:9527'), 9527)
  assert.equal(resolvePlaylistIdFromQueueSourceKey('playlist:0'), null)
  assert.equal(resolvePlaylistIdFromQueueSourceKey('album:9527'), null)
  assert.equal(resolvePlaylistIdFromQueueSourceKey(null), null)
  assert.deepEqual(resolveQueueSourceDescriptor('playlist:9527'), {
    type: 'playlist',
    id: 9527,
  })
  assert.deepEqual(resolveQueueSourceDescriptor('liked-songs:9527'), {
    type: 'liked-songs',
    id: 9527,
  })
  assert.deepEqual(resolveQueueSourceDescriptor('album:9527'), {
    type: 'album',
    id: 9527,
  })
  assert.deepEqual(resolveQueueSourceDescriptor('cloud:9527'), {
    type: 'cloud',
    id: 9527,
  })
  assert.equal(resolveQueueSourceDescriptor('search'), null)
})

test('queue index helpers respect playlist boundaries', () => {
  assert.equal(getNextQueueIndex(tracks, 0), 1)
  assert.equal(getNextQueueIndex(tracks, 1), null)
  assert.equal(getPreviousQueueIndex(tracks, 1), 0)
  assert.equal(getPreviousQueueIndex(tracks, 0), null)
})

test('getPlaybackQueueItemState marks current playing queue item', () => {
  assert.deepEqual(getPlaybackQueueItemState(1, 1, 'playing'), {
    isActive: true,
    isPlaying: true,
  })

  assert.deepEqual(getPlaybackQueueItemState(1, 1, 'paused'), {
    isActive: true,
    isPlaying: false,
  })

  assert.deepEqual(getPlaybackQueueItemState(0, 1, 'playing'), {
    isActive: false,
    isPlaying: false,
  })
})

test('normalizePlaybackVolume clamps invalid values to a valid percentage', () => {
  assert.equal(normalizePlaybackVolume(22), 22)
  assert.equal(normalizePlaybackVolume(-1), 0)
  assert.equal(normalizePlaybackVolume(101), 100)
  assert.equal(normalizePlaybackVolume(Number.NaN), 70)
  assert.equal(normalizePlaybackVolume('22'), 70)
})

test('playback mode helpers normalize and cycle the three supported modes', () => {
  assert.deepEqual(PLAYBACK_MODE_SEQUENCE, [
    'repeat-all',
    'shuffle',
    'repeat-one',
  ])
  assert.equal(normalizePlaybackMode('repeat-all'), 'repeat-all')
  assert.equal(normalizePlaybackMode('shuffle'), 'shuffle')
  assert.equal(normalizePlaybackMode('repeat-one'), 'repeat-one')
  assert.equal(normalizePlaybackMode('unknown'), 'repeat-all')
  assert.equal(normalizePlaybackMode(null), 'repeat-all')
  assert.equal(getNextPlaybackMode('repeat-all'), 'shuffle')
  assert.equal(getNextPlaybackMode('shuffle'), 'repeat-one')
  assert.equal(getNextPlaybackMode('repeat-one'), 'repeat-all')
})

test('createShuffleOrder keeps every queue index once and anchors current index first', () => {
  const order = createShuffleOrder(4, 2, () => 0.5)

  assert.equal(order[0], 2)
  assert.deepEqual(
    [...order].sort((a, b) => a - b),
    [0, 1, 2, 3]
  )
  assert.equal(new Set(order).size, 4)
})

test('resolvePlaybackQueueStep loops repeat-all queue boundaries', () => {
  assert.deepEqual(
    resolvePlaybackQueueStep({
      queueLength: 2,
      currentIndex: 1,
      playbackMode: 'repeat-all',
      direction: 'next',
    }).index,
    0
  )
  assert.deepEqual(
    resolvePlaybackQueueStep({
      queueLength: 2,
      currentIndex: 0,
      playbackMode: 'repeat-all',
      direction: 'previous',
    }).index,
    1
  )
})

test('resolvePlaybackQueueStep repeats one track on auto advance and skips manually', () => {
  assert.equal(
    resolvePlaybackQueueStep({
      queueLength: 3,
      currentIndex: 1,
      playbackMode: 'repeat-one',
      direction: 'next',
      reason: 'auto',
    }).index,
    1
  )
  assert.equal(
    resolvePlaybackQueueStep({
      queueLength: 3,
      currentIndex: 1,
      playbackMode: 'repeat-one',
      direction: 'next',
      reason: 'manual',
    }).index,
    2
  )
})

test('resolvePlaybackQueueStep advances through shuffle order without changing queue order', () => {
  const firstStep = resolvePlaybackQueueStep({
    queueLength: 3,
    currentIndex: 0,
    playbackMode: 'shuffle',
    direction: 'next',
    shuffleOrder: [0, 2, 1],
    shuffleCursor: 0,
  })

  assert.equal(firstStep.index, 2)
  assert.deepEqual(firstStep.shuffleOrder, [0, 2, 1])
  assert.equal(firstStep.shuffleCursor, 1)

  const wrappedStep = resolvePlaybackQueueStep({
    queueLength: 3,
    currentIndex: 1,
    playbackMode: 'shuffle',
    direction: 'next',
    shuffleOrder: [0, 2, 1],
    shuffleCursor: 2,
    random: () => 0.5,
  })

  assert.equal(wrappedStep.index === 1, false)
  assert.deepEqual(
    [...wrappedStep.shuffleOrder].sort((a, b) => a - b),
    [0, 1, 2]
  )
  assert.equal(wrappedStep.shuffleCursor, 1)
})
