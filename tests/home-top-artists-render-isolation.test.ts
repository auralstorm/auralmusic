import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const topArtistsSource = readFileSync(
  new URL(
    '../src/renderer/pages/Home/components/TopArtists.tsx',
    import.meta.url
  ),
  'utf8'
)
const homeFmFeatureCardSource = readFileSync(
  new URL(
    '../src/renderer/pages/Home/components/HomeFmFeatureCard.tsx',
    import.meta.url
  ),
  'utf8'
)
const fmFeatureCardSource = readFileSync(
  new URL(
    '../src/renderer/pages/Home/components/FmFeatureCard.tsx',
    import.meta.url
  ),
  'utf8'
)

test('home top artists autoplay keeps a memo boundary around personal fm', () => {
  assert.match(
    topArtistsSource,
    /const\s+handleOpenArtistDetail\s*=\s*useCallback\(/
  )
  assert.match(
    homeFmFeatureCardSource,
    /export\s+default\s+memo\(HomeFmFeatureCard\)/
  )
  assert.match(fmFeatureCardSource, /export\s+default\s+memo\(FmFeatureCard\)/)
})
