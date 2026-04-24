import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const settingsSource = readFileSync(
  new URL(
    '../src/renderer/pages/Settings/components/LocalLibrarySettings.tsx',
    import.meta.url
  ),
  'utf8'
)

test('local library settings auto-refreshes import data when roots change', () => {
  assert.match(settingsSource, /const handleSyncRoots = async/)
  assert.match(settingsSource, /await localLibraryApi\.syncRoots\(nextRoots\)/)
  assert.match(settingsSource, /await localLibraryApi\.scan\(\)/)
  assert.match(
    settingsSource,
    /handleRemoveDirectory[\s\S]*?await handleSyncRoots\(nextRoots\)[\s\S]*?await loadSnapshot\(\)/
  )
  assert.match(
    settingsSource,
    /handleAddDirectories[\s\S]*?await handleSyncRoots\(nextRoots\)[\s\S]*?await localLibraryApi\.scan\(\)[\s\S]*?await loadSnapshot\(\)/
  )
})

test('local library settings exposes selectable scan formats', () => {
  assert.match(settingsSource, /LOCAL_LIBRARY_SCAN_FORMAT_OPTIONS\.map/)
  assert.match(settingsSource, /handleToggleScanFormat/)
  assert.match(
    settingsSource,
    /setConfig\('localLibraryScanFormats', normalizedFormats\)/
  )
})

test('local library settings exposes online lyric match toggle', () => {
  assert.match(settingsSource, /localLibraryOnlineLyricMatchEnabled/)
  assert.match(settingsSource, /在线补齐本地歌词与封面/)
  assert.match(
    settingsSource,
    /setConfig\(\s*'localLibraryOnlineLyricMatchEnabled'/
  )
})
