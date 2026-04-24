import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const localLibraryPageSource = readFileSync(
  new URL('../src/renderer/pages/LocalLibrary/index.tsx', import.meta.url),
  'utf8'
)

test('local library page skips overview and query bootstrap when no roots are configured', () => {
  assert.match(
    localLibraryPageSource,
    /if\s*\(\s*configuredRoots\.length\s*===\s*0\s*\)\s*\{\s*setOverview\(EMPTY_LOCAL_LIBRARY_OVERVIEW\)\s*resetQueryStates\(\)\s*setIsLoading\(false\)\s*return\s+EMPTY_LOCAL_LIBRARY_OVERVIEW\s*\}/
  )
})
