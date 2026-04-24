import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { LOCAL_LIBRARY_IPC_CHANNELS } from '../src/shared/ipc/local-library.ts'

const preloadSource = readFileSync(
  new URL('../src/preload/api/local-library-api.ts', import.meta.url),
  'utf8'
)

const mainIpcSource = readFileSync(
  new URL('../src/main/ipc/local-library-ipc.ts', import.meta.url),
  'utf8'
)

test('local library ipc exposes sync-roots channel across shared, preload, and main layers', () => {
  assert.equal(
    LOCAL_LIBRARY_IPC_CHANNELS.SYNC_ROOTS,
    'local-library:sync-roots'
  )
  assert.match(preloadSource, /syncRoots:\s*async\s+roots\s*=>/)
  assert.match(preloadSource, /LOCAL_LIBRARY_IPC_CHANNELS\.SYNC_ROOTS/)
  assert.match(mainIpcSource, /LOCAL_LIBRARY_IPC_CHANNELS\.SYNC_ROOTS/)
  assert.match(mainIpcSource, /syncLocalLibraryRoots\(roots\)/)
})
