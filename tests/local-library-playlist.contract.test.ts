import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const pageSource = readFileSync(
  new URL('../src/renderer/pages/LocalLibrary/index.tsx', import.meta.url),
  'utf8'
)

const detailPageSource = readFileSync(
  new URL(
    '../src/renderer/pages/LocalLibraryPlaylistDetail/index.tsx',
    import.meta.url
  ),
  'utf8'
)

const toolbarSource = readFileSync(
  new URL(
    '../src/renderer/pages/LocalLibrary/components/LocalLibraryToolbar.tsx',
    import.meta.url
  ),
  'utf8'
)

const playlistCardSource = readFileSync(
  new URL(
    '../src/renderer/pages/LocalLibrary/components/LocalLibraryPlaylistCard.tsx',
    import.meta.url
  ),
  'utf8'
)

const drawerSource = readFileSync(
  new URL(
    '../src/renderer/pages/LocalLibrary/components/LocalLibraryAddToPlaylistDrawer.tsx',
    import.meta.url
  ),
  'utf8'
)

const routerSource = readFileSync(
  new URL('../src/renderer/router/router.config.tsx', import.meta.url),
  'utf8'
)

test('local library toolbar exposes playlists tab', () => {
  assert.match(toolbarSource, /value='playlists'/)
  assert.match(toolbarSource, />\s*歌单\s*</)
})

test('local library page wires playlist list and add-to-playlist drawer', () => {
  assert.match(pageSource, /value='playlists'/)
  assert.match(
    pageSource,
    /navigate\(`\/local-library\/playlists\/\$\{playlist\.id\}`\)/
  )
  assert.match(pageSource, /LocalLibraryPlaylistCard/)
  assert.match(pageSource, /LocalLibraryAddToPlaylistDrawer/)
  assert.match(pageSource, /handleOpenAddToPlaylistDrawer/)
  assert.doesNotMatch(pageSource, /useParams<\{ playlistId\?: string \}>/)
})

test('local playlist detail page owns playlist detail querying and playlist track mutations', () => {
  assert.match(detailPageSource, /localLibraryApi\.getPlaylistDetail\(/)
  assert.match(detailPageSource, /handleRemoveFromPlaylist/)
  assert.match(detailPageSource, /createLocalLibraryPlaylistQueueSourceKey/)
  assert.match(detailPageSource, /navigate\('\/local-library'\)/)
})

test('local library router exposes a dedicated playlist detail route', () => {
  assert.match(
    routerSource,
    /path:\s*'\/local-library\/playlists\/:playlistId'/
  )
  assert.match(routerSource, /title:\s*'本地歌单详情'/)
})

test('local library playlist card follows album-card style with rename and delete actions', () => {
  assert.match(playlistCardSource, /AvatarCover/)
  assert.match(playlistCardSource, /<ListMusic className='size-12' \/>/)
  assert.match(playlistCardSource, /重命名/)
  assert.match(playlistCardSource, /删除歌单/)
})

test('local add-to-playlist drawer supports direct add and create-then-add flows', () => {
  assert.match(drawerSource, /添加到歌单/)
  assert.match(drawerSource, /新建并添加/)
  assert.match(drawerSource, /已在歌单中/)
})
