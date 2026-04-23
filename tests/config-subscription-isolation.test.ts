import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const trackListItemSource = readFileSync(
  new URL(
    '../src/renderer/components/TrackList/TrackListItem.tsx',
    import.meta.url
  ),
  'utf8'
)

const playbackEngineSource = readFileSync(
  new URL(
    '../src/renderer/components/PlaybackControl/PlaybackEngine.tsx',
    import.meta.url
  ),
  'utf8'
)

test('track list item subscribes only to download config fields it uses', () => {
  assert.doesNotMatch(
    trackListItemSource,
    /const\s+downloadConfig\s*=\s*useConfigStore\(state\s*=>\s*state\.config\)/
  )
  assert.match(
    trackListItemSource,
    /const\s+downloadEnabled\s*=\s*useConfigStore\(state\s*=>\s*state\.config\.downloadEnabled\)/
  )
  assert.match(
    trackListItemSource,
    /const\s+downloadQuality\s*=\s*useConfigStore\(state\s*=>\s*state\.config\.downloadQuality\)/
  )
  assert.match(
    trackListItemSource,
    /const\s+downloadQualityPolicy\s*=\s*useConfigStore\([\s\S]*state\s*=>\s*state\.config\.downloadQualityPolicy[\s\S]*\)/
  )
})

test('playback engine avoids subscribing to the full config object', () => {
  assert.doesNotMatch(
    playbackEngineSource,
    /const\s+config\s*=\s*useConfigStore\(state\s*=>\s*state\.config\)/
  )
  assert.match(
    playbackEngineSource,
    /const\s+musicSourceEnabled\s*=\s*useConfigStore\([\s\S]*state\s*=>\s*state\.config\.musicSourceEnabled[\s\S]*\)/
  )
  assert.match(
    playbackEngineSource,
    /const\s+musicSourceProviders\s*=\s*useConfigStore\([\s\S]*state\s*=>\s*state\.config\.musicSourceProviders[\s\S]*\)/
  )
  assert.match(
    playbackEngineSource,
    /const\s+enhancedSourceModules\s*=\s*useConfigStore\([\s\S]*state\s*=>\s*state\.config\.enhancedSourceModules[\s\S]*\)/
  )
  assert.match(
    playbackEngineSource,
    /const\s+luoxueMusicSourceScripts\s*=\s*useConfigStore\([\s\S]*state\s*=>\s*state\.config\.luoxueMusicSourceScripts[\s\S]*\)/
  )
})
