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

test('artist media tabs only renders the active panel and keeps panel components isolated', () => {
  assert.equal(
    existsSync(
      new URL(
        '../src/renderer/pages/Artists/Detail/components/ArtistAlbumsPanel.tsx',
        import.meta.url
      )
    ),
    true
  )
  assert.equal(
    existsSync(
      new URL(
        '../src/renderer/pages/Artists/Detail/components/ArtistMvsPanel.tsx',
        import.meta.url
      )
    ),
    true
  )
  assert.equal(
    existsSync(
      new URL(
        '../src/renderer/pages/Artists/Detail/components/ArtistSimilarArtistsPanel.tsx',
        import.meta.url
      )
    ),
    true
  )

  assert.match(
    artistMediaTabsSource,
    /const\s+\[activeTab,\s*setActiveTab\]\s*=\s*useState<ArtistMediaTabValue>\('albums'\)/
  )
  assert.match(
    artistMediaTabsSource,
    /<Tabs[\s\S]*value=\{activeTab\}[\s\S]*onValueChange=\{\s*value\s*=>\s*setActiveTab\(value as ArtistMediaTabValue\)\s*\}/
  )
  assert.match(
    artistMediaTabsSource,
    /activeTab === 'albums' \? \(\s*<ArtistAlbumsPanel/
  )
  assert.match(
    artistMediaTabsSource,
    /activeTab === 'mvs' \? \(\s*<ArtistMvsPanel/
  )
  assert.match(artistMediaTabsSource, /<ArtistSimilarArtistsPanel/)
  assert.match(
    artistMediaTabsSource,
    /export\s+default\s+memo\(ArtistMediaTabs\)/
  )
  assert.doesNotMatch(artistMediaTabsSource, /<TabsContent/)
})
