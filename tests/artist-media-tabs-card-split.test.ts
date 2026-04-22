import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const artistMediaTabsSource = readFileSync(
  new URL(
    '../src/renderer/pages/Artists/Detail/components/ArtistMediaTabs.tsx',
    import.meta.url
  ),
  'utf8'
)

test('artist media tabs delegates album and mv rendering to dedicated card components', () => {
  assert.equal(
    existsSync(
      new URL(
        '../src/renderer/pages/Artists/Detail/components/ArtistAlbumCard.tsx',
        import.meta.url
      )
    ),
    true
  )

  assert.equal(
    existsSync(
      new URL(
        '../src/renderer/pages/Artists/Detail/components/ArtistMvCard.tsx',
        import.meta.url
      )
    ),
    true
  )

  assert.match(
    artistMediaTabsSource,
    /import\s+ArtistAlbumsPanel\s+from\s+'\.\/ArtistAlbumsPanel'/
  )
  assert.match(
    artistMediaTabsSource,
    /import\s+ArtistMvsPanel\s+from\s+'\.\/ArtistMvsPanel'/
  )
  assert.match(
    artistMediaTabsSource,
    /<ArtistAlbumsPanel[\s\S]*albums=\{albums\}[\s\S]*onToAlbumDetail=\{onToAlbumDetail\}[\s\S]*\/>/
  )
  assert.match(
    artistMediaTabsSource,
    /<ArtistMvsPanel[\s\S]*mvs=\{mvs\}[\s\S]*onToMvDetail=\{onToMvDetail\}[\s\S]*\/>/
  )
  assert.doesNotMatch(
    artistMediaTabsSource,
    /<article[\s\S]*DeferredCachedImage[\s\S]*album\.name/
  )
  assert.doesNotMatch(
    artistMediaTabsSource,
    /<article[\s\S]*<img[\s\S]*mv\.name/
  )
})
