import test from 'node:test'
import assert from 'node:assert/strict'

import { shouldRenderDynamicPlayerSceneArtwork } from '../src/renderer/components/PlayerScene/player-scene-artwork.model.ts'

test('shouldRenderDynamicPlayerSceneArtwork only enables 3D artwork when the player scene is open', () => {
  assert.equal(
    shouldRenderDynamicPlayerSceneArtwork({
      coverUrl: 'https://example.com/cover.jpg',
      dynamicCoverEnabled: true,
      isSceneOpen: true,
    }),
    true
  )

  assert.equal(
    shouldRenderDynamicPlayerSceneArtwork({
      coverUrl: 'https://example.com/cover.jpg',
      dynamicCoverEnabled: true,
      isSceneOpen: false,
    }),
    false
  )

  assert.equal(
    shouldRenderDynamicPlayerSceneArtwork({
      coverUrl: '',
      dynamicCoverEnabled: true,
      isSceneOpen: true,
    }),
    false
  )

  assert.equal(
    shouldRenderDynamicPlayerSceneArtwork({
      coverUrl: 'https://example.com/cover.jpg',
      dynamicCoverEnabled: false,
      isSceneOpen: true,
    }),
    false
  )
})
