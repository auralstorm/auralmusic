import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const playlistDetailSource = readFileSync(
  new URL('../src/renderer/pages/PlayList/Detail/index.tsx', import.meta.url),
  'utf8'
)

test('playlist detail page paginates tracks with infinite scroll', () => {
  assert.match(playlistDetailSource, /useIntersectionLoadMore/)
  assert.match(playlistDetailSource, /const PAGE_SIZE = 30/)
  assert.match(playlistDetailSource, /limit:\s*PAGE_SIZE/)
  assert.match(
    playlistDetailSource,
    /onEndReached=\{\(\)\s*=>\s*void loadMore\(\)\}/
  )
  assert.match(playlistDetailSource, /hasMore=\{hasMore\}/)
  assert.match(playlistDetailSource, /loading=\{loading && !isInitialLoading\}/)
})
