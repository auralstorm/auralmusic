import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const artistLatestReleaseSource = readFileSync(
  new URL(
    '../src/renderer/pages/Artists/Detail/components/ArtistLatestRelease.tsx',
    import.meta.url
  ),
  'utf8'
)

const artistLatestReleaseCardSource = readFileSync(
  new URL(
    '../src/renderer/pages/Artists/Detail/components/ArtistLatestReleaseCard.tsx',
    import.meta.url
  ),
  'utf8'
)

test('artist latest release delegates album and mv rendering to reusable release cards', () => {
  assert.equal(
    existsSync(
      new URL(
        '../src/renderer/pages/Artists/Detail/components/ArtistLatestReleaseCard.tsx',
        import.meta.url
      )
    ),
    true
  )

  assert.match(
    artistLatestReleaseSource,
    /import\s+ArtistLatestReleaseCard\s+from\s+'\.\/ArtistLatestReleaseCard'/
  )
  assert.match(
    artistLatestReleaseSource,
    /<ArtistLatestReleaseCard[\s\S]*kindLabel='最新专辑'/
  )
  assert.match(
    artistLatestReleaseSource,
    /<ArtistLatestReleaseCard[\s\S]*kindLabel='最新专辑'[\s\S]*onPlay=/
  )
  assert.match(
    artistLatestReleaseSource,
    /<ArtistLatestReleaseCard[\s\S]*kindLabel='最新 MV'/
  )
})

test('artist latest release card supports cover hover play affordance', () => {
  assert.match(
    artistLatestReleaseCardSource,
    /import\s+\{\s*Play\s*\}\s+from\s+'lucide-react'/
  )
  assert.match(artistLatestReleaseCardSource, /pointer-events-none/)
  assert.match(artistLatestReleaseCardSource, /pointer-events-auto/)
  assert.match(artistLatestReleaseCardSource, /group-hover:opacity-100/)
  assert.doesNotMatch(
    artistLatestReleaseCardSource,
    /group-focus-within:opacity-100/
  )
  assert.match(artistLatestReleaseCardSource, /event\.stopPropagation\(\)/)
  assert.match(artistLatestReleaseCardSource, /if\s*\(onPlay\)\s*\{/)
  assert.match(artistLatestReleaseCardSource, /onOpen\?\.\(\)/)
})
