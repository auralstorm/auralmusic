import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildArtistHeroImageCacheKey,
  buildArtistSimilarImageCacheKey,
  resolveArtistAlbumImages,
  resolveArtistMvImages,
  resolveArtistProfileImage,
  resolveSimilarArtistImages,
} from '../src/renderer/pages/Artists/Detail/artist-image-cache.ts'

test('artist detail image cache helpers use semantic keys and preserve empty urls', async () => {
  const calls: Array<[string, string]> = []
  const cacheApi = {
    resolveImageSource: async (cacheKey: string, sourceUrl: string) => {
      calls.push([cacheKey, sourceUrl])
      return {
        url: `file:///cache/${calls.length}.webp`,
        fromCache: true,
      }
    },
  }

  assert.equal(buildArtistHeroImageCacheKey(7), 'artist:detail:hero:7')
  assert.equal(
    buildArtistSimilarImageCacheKey(7, 21),
    'artist:detail:similar:7:21'
  )

  const profile = await resolveArtistProfileImage(cacheApi, {
    id: 7,
    name: 'Artist 7',
    coverUrl: 'https://img.example.com/7.jpg',
    musicSize: 10,
    albumSize: 2,
    mvSize: 1,
    identity: 'Singer',
  })

  const similarArtists = await resolveSimilarArtistImages(cacheApi, 7, [
    { id: 21, name: 'Similar 21', picUrl: 'https://img.example.com/21.jpg' },
    { id: 22, name: 'Similar 22', picUrl: '' },
  ])

  const albums = await resolveArtistAlbumImages(cacheApi, [
    { id: 301, name: 'Album 301', picUrl: 'https://img.example.com/301.jpg' },
  ])

  const mvs = await resolveArtistMvImages(cacheApi, [
    { id: 401, name: 'MV 401', coverUrl: 'https://img.example.com/401.jpg' },
  ])

  assert.equal(profile?.coverUrl, 'file:///cache/1.webp')
  assert.equal(similarArtists[0]?.picUrl, 'file:///cache/2.webp')
  assert.equal(similarArtists[1]?.picUrl, '')
  assert.equal(albums[0]?.picUrl, 'file:///cache/3.webp')
  assert.equal(mvs[0]?.coverUrl, 'file:///cache/4.webp')
  assert.deepEqual(calls, [
    ['artist:detail:hero:7', 'https://img.example.com/7.jpg'],
    ['artist:detail:similar:7:21', 'https://img.example.com/21.jpg'],
    ['artist:detail:album:301', 'https://img.example.com/301.jpg'],
    ['artist:detail:mv:401', 'https://img.example.com/401.jpg'],
  ])
})
