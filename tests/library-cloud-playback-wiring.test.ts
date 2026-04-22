import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const cloudPanelSource = readFileSync(
  new URL(
    '../src/renderer/pages/Library/components/LibraryCloudPanel.tsx',
    import.meta.url
  ),
  'utf8'
)

test('library cloud panel provides a cloud playback queue source key', () => {
  assert.match(cloudPanelSource, /createCloudQueueSourceKey/)
  assert.match(
    cloudPanelSource,
    /useAuthStore\(state => state\.user\?\.userId\)/
  )
  assert.match(cloudPanelSource, /const\s+playbackQueueKey\s*=/)
  assert.match(
    cloudPanelSource,
    /<TrackList[\s\S]*playbackQueueKey=\{playbackQueueKey\}/
  )
})
