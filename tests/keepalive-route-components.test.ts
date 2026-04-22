import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const routeComponentsSource = readFileSync(
  new URL('../src/renderer/router/routeComponents.tsx', import.meta.url),
  'utf8'
)
const rendererEntrySource = readFileSync(
  new URL('../src/renderer/main.tsx', import.meta.url),
  'utf8'
)

const routeComponents = [
  ['Home', '@/pages/Home'],
  ['DailySongs', '@/pages/DailySongs'],
  ['Library', '@/pages/Library'],
  ['LikedSongs', '@/pages/LikedSongs'],
  ['Settings', '@/pages/Settings'],
  ['Downloads', '@/pages/Downloads'],
  ['Charts', '@/pages/Charts'],
  ['PlayList', '@/pages/PlayList'],
  ['PlaylistDetail', '@/pages/PlayList/Detail'],
  ['MvDetail', '@/pages/Mv/Detail'],
  ['Artists', '@/pages/Artists'],
  ['ArtistDetail', '@/pages/Artists/Detail'],
  ['ArtistSongs', '@/pages/Artists/Songs'],
  ['Albums', '@/pages/Albums'],
  ['AlbumDetail', '@/pages/Albums/Detail'],
] as const

test('route components are loaded synchronously', () => {
  assert.doesNotMatch(routeComponentsSource, /\blazy\s*\(/)
  assert.doesNotMatch(routeComponentsSource, /from\s+['"]react['"]/)

  for (const [componentName, importPath] of routeComponents) {
    assert.match(
      routeComponentsSource,
      new RegExp(`import\\s+${componentName}\\s+from\\s+['"]${importPath}['"]`)
    )
  }
})

test('renderer entry does not wrap eager routes in Suspense', () => {
  assert.doesNotMatch(rendererEntrySource, /Suspense/)
})
