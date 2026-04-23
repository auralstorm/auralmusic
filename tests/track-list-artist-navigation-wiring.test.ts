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

test('track list item supports artist detail navigation without breaking row playback interactions', () => {
  assert.match(trackListItemSource, /useNavigate/)
  assert.match(trackListItemSource, /useLocation/)
  assert.match(
    trackListItemSource,
    /shouldNavigateToArtistDetail\(location\.pathname,\s*artistId\)/
  )
  assert.match(trackListItemSource, /navigate\(`\/artists\/\$\{artistId\}`\)/)
  assert.match(trackListItemSource, /event\.preventDefault\(\)/)
  assert.match(trackListItemSource, /event\.stopPropagation\(\)/)
  assert.match(trackListItemSource, /if\s*\(!artistId\)\s*\{\s*return/)
  assert.match(
    trackListItemSource,
    /if\s*\(!shouldNavigateToArtistDetail\([\s\S]*?\)\)\s*\{\s*return/
  )
})

test('track list item renders per-artist clickable names only when artist ids are available', () => {
  assert.match(
    trackListItemSource,
    /const\s+shouldRenderArtistLinks\s*=\s*artistList\.some/
  )
  assert.match(trackListItemSource, /artist\.id\s*\?\s*\(/)
  assert.match(trackListItemSource, /renderArtistName\(\)/)
})
