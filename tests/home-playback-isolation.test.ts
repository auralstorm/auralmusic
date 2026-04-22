import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const homeSource = readFileSync(
  new URL('../src/renderer/pages/Home/index.tsx', import.meta.url),
  'utf8'
)

test('home page isolates personal fm playback subscriptions from the main page tree', () => {
  assert.equal(
    existsSync(
      new URL(
        '../src/renderer/pages/Home/components/HomeFmFeatureCard.tsx',
        import.meta.url
      )
    ),
    true
  )

  assert.match(
    homeSource,
    /import\s+HomeFmFeatureCard\s+from\s+'\.\/components\/HomeFmFeatureCard'/
  )
  assert.doesNotMatch(
    homeSource,
    /const\s+currentTrack\s*=\s*usePlaybackStore\(state\s*=>\s*state\.currentTrack\)/
  )
  assert.doesNotMatch(
    homeSource,
    /const\s+playbackStatus\s*=\s*usePlaybackStore\(state\s*=>\s*state\.status\)/
  )
  assert.doesNotMatch(
    homeSource,
    /const\s+togglePlay\s*=\s*usePlaybackStore\(state\s*=>\s*state\.togglePlay\)/
  )
  assert.match(homeSource, /const\s+handlePlayNewSong\s*=\s*useCallback\(/)
  assert.match(
    homeSource,
    /<HomeFmFeatureCard[\s\S]*track=\{fmTrack\}[\s\S]*isLoading=\{featureLoading\}[\s\S]*actionLoading=\{fmActionLoading\}[\s\S]*onMoveToNext=\{handleMoveToNextFm\}[\s\S]*onTrashCurrent=\{handleTrashCurrentFm\}[\s\S]*\/>/
  )
})
