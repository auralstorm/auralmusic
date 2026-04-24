import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    'src/renderer/components/PlayerScene/player-lyrics.service.ts'
  ),
  'utf8'
)

test('local lyric service also matches online metadata when cover is missing', () => {
  assert.match(
    source,
    /const\s+needsCoverMatch\s*=\s*!currentTrack\.coverUrl\.trim\(\)/
  )
  assert.match(
    source,
    /if\s*\(localLyricBundle\)\s*{[\s\S]*if\s*\(!hasCoverUrl\(currentTrack\.coverUrl\)\)\s*{[\s\S]*matchOnlineLocalTrackMetadata\(currentTrack,\s*localLyricBundle\)/
  )
})

test('local lyric service patches playback store with matched supplemental metadata', () => {
  assert.match(source, /usePlaybackStore/)
  assert.match(source, /patchTrackMetadata\(/)
})
