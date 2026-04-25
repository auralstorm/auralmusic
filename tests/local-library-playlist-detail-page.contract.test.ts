import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const routerSource = readFileSync(
  new URL('../src/renderer/router/router.config.tsx', import.meta.url),
  'utf8'
)

const routeComponentsSource = readFileSync(
  new URL('../src/renderer/router/routeComponents.tsx', import.meta.url),
  'utf8'
)

const pageSource = readFileSync(
  new URL(
    '../src/renderer/pages/LocalLibraryPlaylistDetail/index.tsx',
    import.meta.url
  ),
  'utf8'
)

test('playlist detail route points to standalone local playlist detail page', () => {
  assert.match(
    routerSource,
    /path:\s*'\/local-library\/playlists\/:playlistId'/
  )
  assert.match(routerSource, /element:\s*<LocalLibraryPlaylistDetail\s*\/>/)
  assert.match(routeComponentsSource, /LocalLibraryPlaylistDetail/)
  assert.match(pageSource, /LocalLibraryEntityDetailLayout/)
  assert.match(pageSource, /useParams/)
  assert.match(pageSource, /LocalLibraryEntityDetailHero/)
  assert.match(pageSource, /localLibraryApi\.getPlaylistDetail\(/)
  assert.match(pageSource, /LocalLibraryTrackList/)
  assert.match(pageSource, /handleRemoveFromPlaylist/)
  assert.match(pageSource, /createLocalLibraryPlaylistQueueSourceKey/)
  assert.match(pageSource, /navigate\('\/local-library'\)/)
  assert.match(pageSource, /DropdownMenuTrigger/)
  assert.match(pageSource, /MoreHorizontal/)
  assert.match(pageSource, /重命名/)
  assert.match(pageSource, /删除歌单/)
  assert.match(pageSource, /useDebouncedValue/)
  assert.match(
    pageSource,
    /const debouncedKeyword = useDebouncedValue\(keyword/
  )
  assert.match(
    pageSource,
    /playlistId:\s*numericPlaylistId,\s*keyword:\s*debouncedKeyword/s
  )
})
