import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeHomeDailyTracks,
  normalizeHomeFmTrack,
  normalizeHomeNewSongTracks,
} from '../src/renderer/pages/Home/home.model.ts'

test('normalizeHomeFmTrack converts personal fm song to playback track', () => {
  const track = normalizeHomeFmTrack({
    id: 347230,
    name: 'Thousand Miles',
    duration: 213000,
    artists: [{ name: 'The Kid LAROI' }, { name: 'Jung Kook' }],
    album: {
      name: 'FM Album',
      picUrl: 'https://example.com/cover.jpg',
    },
  })

  assert.deepEqual(track, {
    id: 347230,
    name: 'Thousand Miles',
    artistNames: 'The Kid LAROI / Jung Kook',
    albumName: 'FM Album',
    coverUrl: 'https://example.com/cover.jpg',
    duration: 213000,
  })
})

test('normalizeHomeFmTrack supports netease ar/al/dt aliases', () => {
  const track = normalizeHomeFmTrack({
    id: 100,
    name: 'Alias Song',
    dt: 120000,
    ar: [{ name: 'Alias Artist' }],
    al: {
      name: 'Alias Album',
      picUrl: 'alias-cover',
    },
  })

  assert.equal(track?.artistNames, 'Alias Artist')
  assert.equal(track?.albumName, 'Alias Album')
  assert.equal(track?.coverUrl, 'alias-cover')
  assert.equal(track?.duration, 120000)
})

test('normalizeHomeFmTrack returns null for invalid fm song', () => {
  assert.equal(normalizeHomeFmTrack({ name: 'Missing id' }), null)
  assert.equal(normalizeHomeFmTrack({ id: 1 }), null)
})

test('normalizeHomeDailyTracks converts daily songs to playback tracks', () => {
  const tracks = normalizeHomeDailyTracks([
    {
      id: 1,
      name: 'Daily One',
      dt: 188000,
      ar: [{ name: 'Artist A' }, { name: 'Artist B' }],
      al: {
        name: 'Daily Album',
        picUrl: 'daily-cover',
      },
    },
    {
      name: 'Invalid Song',
    },
  ])

  assert.deepEqual(tracks, [
    {
      id: 1,
      name: 'Daily One',
      artistNames: 'Artist A / Artist B',
      albumName: 'Daily Album',
      coverUrl: 'daily-cover',
      duration: 188000,
    },
  ])
})

test('normalizeHomeNewSongTracks converts personalized new songs to playback tracks', () => {
  const tracks = normalizeHomeNewSongTracks([
    {
      id: 2,
      name: 'New Song',
      picUrl: 'song-cover',
      song: {
        duration: 199000,
        artists: [{ name: 'New Artist' }],
        album: {
          name: 'New Album',
          picUrl: 'album-cover',
        },
      },
    },
  ])

  assert.deepEqual(tracks, [
    {
      id: 2,
      name: 'New Song',
      artistNames: 'New Artist',
      albumName: 'New Album',
      coverUrl: 'song-cover',
      duration: 199000,
    },
  ])
})
