import test from 'node:test'
import assert from 'node:assert/strict'

import {
  resolvePlayerSceneCoverFitMode,
  shouldRenderDynamicPlayerSceneArtwork,
} from '../src/renderer/components/PlayerScene/player-scene-artwork.model.ts'

test('shouldRenderDynamicPlayerSceneArtwork only enables motion when the player is actively playing', () => {
  assert.equal(
    shouldRenderDynamicPlayerSceneArtwork({
      coverUrl: 'https://example.com/cover.jpg',
      dynamicCoverEnabled: true,
      isPlaying: true,
      isSceneOpen: true,
    }),
    true
  )

  assert.equal(
    shouldRenderDynamicPlayerSceneArtwork({
      coverUrl: 'https://example.com/cover.jpg',
      dynamicCoverEnabled: true,
      isPlaying: true,
      isSceneOpen: false,
    }),
    false
  )

  assert.equal(
    shouldRenderDynamicPlayerSceneArtwork({
      coverUrl: '',
      dynamicCoverEnabled: true,
      isPlaying: true,
      isSceneOpen: true,
    }),
    false
  )

  assert.equal(
    shouldRenderDynamicPlayerSceneArtwork({
      coverUrl: 'https://example.com/cover.jpg',
      dynamicCoverEnabled: false,
      isPlaying: true,
      isSceneOpen: true,
    }),
    false
  )

  assert.equal(
    shouldRenderDynamicPlayerSceneArtwork({
      coverUrl: 'https://example.com/cover.jpg',
      dynamicCoverEnabled: true,
      isPlaying: false,
      isSceneOpen: true,
    }),
    false
  )
})

test('resolvePlayerSceneCoverFitMode keeps square covers filled and protects poster covers', () => {
  assert.equal(
    resolvePlayerSceneCoverFitMode({ textureWidth: 512, textureHeight: 512 }),
    'cover'
  )
  assert.equal(
    resolvePlayerSceneCoverFitMode({ textureWidth: 900, textureHeight: 1024 }),
    'cover'
  )
  assert.equal(
    resolvePlayerSceneCoverFitMode({ textureWidth: 720, textureHeight: 1080 }),
    'contain'
  )
  assert.equal(
    resolvePlayerSceneCoverFitMode({ textureWidth: 1080, textureHeight: 720 }),
    'contain'
  )
})
