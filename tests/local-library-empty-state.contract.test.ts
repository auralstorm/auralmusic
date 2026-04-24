import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const emptyStateSource = readFileSync(
  new URL(
    '../src/renderer/pages/LocalLibrary/components/LocalLibraryEmptyState.tsx',
    import.meta.url
  ),
  'utf8'
)

const pageSource = readFileSync(
  new URL('../src/renderer/pages/LocalLibrary/index.tsx', import.meta.url),
  'utf8'
)

const toolbarSource = readFileSync(
  new URL(
    '../src/renderer/pages/LocalLibrary/components/LocalLibraryToolbar.tsx',
    import.meta.url
  ),
  'utf8'
)

test('local library empty state supports immediate import and scanning feedback', () => {
  assert.match(emptyStateSource, /actionLabel:\s*'立即导入'/)
  assert.match(
    emptyStateSource,
    /description:\s*'目录导入后会自动开始首次扫描，避免再多一次手动确认。'/
  )
  assert.match(emptyStateSource, /importedTrackCount\?: number/)
  assert.match(emptyStateSource, /\{isScanning \? null : \(/)
  assert.match(emptyStateSource, /<Spinner className='text-primary size-7' \/>/)
  assert.match(emptyStateSource, /当前已导入 \{importedTrackCount\} 首歌曲/)
  assert.match(
    emptyStateSource,
    /onClick=\{copy\.actionKey === 'import' \? onImport : onScan\}/
  )
  assert.doesNotMatch(emptyStateSource, /actionLabel:\s*'立即扫描'/)
})

test('local library page wires empty state import and redesigned scan toolbar', () => {
  assert.match(
    pageSource,
    /const handleImportDirectories = useCallback\(async \(\) =>/
  )
  assert.match(pageSource, /await localLibraryApi\.selectDirectories\(\)/)
  assert.match(pageSource, /await localLibraryApi\.syncRoots\(nextRoots\)/)
  assert.match(pageSource, /const summary = await runScanFlow\(\)/)
  assert.match(
    pageSource,
    /onImport=\{\(\) => void handleImportDirectories\(\)\}/
  )
  assert.match(pageSource, /if\s*\(\s*emptyState !== 'not-scanned'/)
  assert.match(pageSource, /autoScanRootKeyRef\.current = autoScanRootKey/)
  assert.match(pageSource, /void runScanFlow\(\)/)
  assert.match(pageSource, /<LocalLibraryToolbar/)
  assert.match(
    toolbarSource,
    /aria-label=\{isScanning \? '扫描中' : '刷新本地乐库'\}/
  )
  assert.match(toolbarSource, /扫描音乐/)
  assert.match(toolbarSource, /<RefreshCw className='size-4' \/>/)
  assert.match(toolbarSource, /<Spinner className='size-4 text-white' \/>/)
})
