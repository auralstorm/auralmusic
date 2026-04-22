import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const appLayoutSource = readFileSync(
  new URL('../src/renderer/layout/AppLayout.tsx', import.meta.url),
  'utf8'
)
const librarySource = readFileSync(
  new URL('../src/renderer/pages/Library/index.tsx', import.meta.url),
  'utf8'
)
const artistDetailSource = readFileSync(
  new URL('../src/renderer/pages/Artists/Detail/index.tsx', import.meta.url),
  'utf8'
)
const mvRouteSource = readFileSync(
  new URL('../src/renderer/pages/Mv/Detail/index.tsx', import.meta.url),
  'utf8'
)
const searchDialogSource = readFileSync(
  new URL('../src/renderer/components/SearchDialog/index.tsx', import.meta.url),
  'utf8'
)
const searchModelSource = readFileSync(
  new URL(
    '../src/renderer/components/SearchDialog/search-dialog.model.ts',
    import.meta.url
  ),
  'utf8'
)

test('AppLayout mounts the shared mv drawer shell', () => {
  assert.match(
    appLayoutSource,
    /import MvDrawer from ['"]@\/components\/MvDrawer['"]/
  )
  assert.match(appLayoutSource, /<MvDrawer \/>/)
  assert.doesNotMatch(appLayoutSource, /LazyMvDrawer/)
})

test('Mv drawer uses a native video element inside a bottom drawer with electron fullscreen control', () => {
  const drawerSource = readFileSync(
    new URL('../src/renderer/components/MvDrawer/index.tsx', import.meta.url),
    'utf8'
  )
  const controlBarSource = readFileSync(
    new URL(
      '../src/renderer/components/MvDrawer/components/MvDrawerControlBar.tsx',
      import.meta.url
    ),
    'utf8'
  )

  assert.match(drawerSource, /<video/)
  assert.match(drawerSource, /autoPlay/)
  assert.doesNotMatch(drawerSource, /\bcontrols\b/)
  assert.doesNotMatch(drawerSource, /plyr-react/)
  assert.doesNotMatch(
    drawerSource,
    /components\/MvDrawerPlayer|\.\/components\/MvDrawerPlayer/
  )
  assert.match(drawerSource, /MvDrawerControlBar/)
  assert.match(drawerSource, /direction='bottom'|direction=\"bottom\"/)
  assert.match(drawerSource, /useWindowExpandedState/)
  assert.match(drawerSource, /toggleExpanded|isExpanded|canExpand/)
  assert.match(controlBarSource, /Slider/)
  assert.match(controlBarSource, /resolveMvDrawerVolumeIcon/)
  assert.match(controlBarSource, /aria-label='MV 音量'/)
})

test('mv entry points open the shared drawer instead of navigating to mv detail routes', () => {
  assert.match(librarySource, /openMvDrawer|openDrawer/)
  assert.doesNotMatch(
    librarySource,
    /navigate\(`\/mv\/|navigate\('\/mv\/|navigate\(\"\/mv\//
  )

  assert.match(artistDetailSource, /openMvDrawer|openDrawer/)
  assert.doesNotMatch(
    artistDetailSource,
    /navigate\(`\/mv\/|navigate\('\/mv\/|navigate\(\"\/mv\//
  )

  assert.match(mvRouteSource, /openMvDrawer|openDrawer/)
  assert.match(searchDialogSource, /openMvDrawer|openDrawer/)
  assert.doesNotMatch(
    searchDialogSource,
    /navigate\(`\/mv\/|navigate\('\/mv\/|navigate\(\"\/mv\//
  )
  assert.doesNotMatch(searchModelSource, /type:\s*'mv'[\s\S]*disabled:\s*true/)
})
