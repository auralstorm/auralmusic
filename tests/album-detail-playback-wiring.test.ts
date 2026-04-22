import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const albumDetailSource = readFileSync(
  new URL('../src/renderer/pages/Albums/Detail/index.tsx', import.meta.url),
  'utf8'
)

test('album detail playback uses album source hydration', () => {
  assert.match(albumDetailSource, /createAlbumQueueSourceKey/)
  assert.match(albumDetailSource, /ensureQueueSourceHydration/)
  assert.match(
    albumDetailSource,
    /playQueueFromIndex\(state\.tracks,\s*0,\s*playbackQueueKey\)/
  )
  assert.match(
    albumDetailSource,
    /void ensureQueueSourceHydration\(\{\s*sourceKey:\s*playbackQueueKey,\s*seedQueue:\s*state\.tracks,\s*startOffset:\s*state\.tracks\.length/
  )
})
