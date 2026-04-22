import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const drawerSource = readFileSync(
  new URL(
    '../src/renderer/components/PlaybackQueueDrawer/index.tsx',
    import.meta.url
  ),
  'utf8'
)

test('PlaybackQueueDrawer uses react-virtuoso for queue virtualization', () => {
  assert.match(drawerSource, /from\s+['"]react-virtuoso['"]/)
  assert.match(drawerSource, /\bVirtuoso\b/)
  assert.match(drawerSource, /no-scrollbar/)
  assert.match(drawerSource, /w-full/)
  assert.match(drawerSource, /initialTopMostItemIndex/)
  assert.match(drawerSource, /openVersion/)
  assert.match(drawerSource, /currentIndex/)
  assert.match(drawerSource, /onOpenAutoFocus/)
  assert.match(drawerSource, /preventDefault/)
})

test('PlaybackQueueDrawer toggles the current track instead of reloading it', () => {
  assert.match(drawerSource, /togglePlay/)
  assert.match(drawerSource, /playCurrentQueueIndex/)
  assert.match(drawerSource, /if\s*\(\s*isActive\s*\)\s*\{\s*togglePlay\(\)/)
  assert.match(drawerSource, /playCurrentQueueIndex\(index\)/)
  assert.doesNotMatch(
    drawerSource,
    /playQueueFromIndex\(queue,\s*index,\s*queueSourceKey\s*\?\?\s*null\)/
  )
})

test('PlaybackQueueDrawer shows a loading overlay while hydrating uncached playlist queues', () => {
  assert.match(
    drawerSource,
    /const\s+\[hydrating,\s*setHydrating\]\s*=\s*useState\(false\)/
  )
  assert.match(drawerSource, /setHydrating\(true\)/)
  assert.match(drawerSource, /setHydrating\(false\)/)
  assert.match(
    drawerSource,
    /absolute inset-0 z-10 flex items-center justify-center/
  )
  assert.match(drawerSource, /backdrop-blur-\[2px\]/)
  assert.match(drawerSource, /正在同步播放列表/)
})
