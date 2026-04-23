import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const playerSceneSource = readFileSync(
  new URL('../src/renderer/components/PlayerScene/index.tsx', import.meta.url),
  'utf8'
)

test('player scene gates AMLL background rendering and playback by open state', () => {
  assert.match(
    playerSceneSource,
    /const showPlayerBackground = useMemo\(\s*\(\) => isOpen && amllBackgroundState\.enabled/
  )
  assert.match(
    playerSceneSource,
    /const shouldPlayAmllBackground = useMemo\(\s*\(\) => isOpen && amllBackgroundState\.playing/
  )
  assert.match(playerSceneSource, /enabled=\{showPlayerBackground\}/)
  assert.match(playerSceneSource, /playing=\{shouldPlayAmllBackground\}/)
})

test('player scene only mounts AMLL lyric player while the player scene is open', () => {
  assert.match(playerSceneSource, /const shouldRenderAmllLyrics = isOpen/)
  assert.match(
    playerSceneSource,
    /const shouldPlayAmllLyrics = isOpen && isPlaying/
  )
  assert.match(playerSceneSource, /\{shouldRenderAmllLyrics \? \(/)
  assert.match(
    playerSceneSource,
    /<PlayerSceneAmllLyrics[\s\S]*playing=\{shouldPlayAmllLyrics\}/
  )
})
