import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const dialogSource = readFileSync(
  new URL('../src/renderer/components/SearchDialog/index.tsx', import.meta.url),
  'utf8'
)

const inputBarSource = readFileSync(
  new URL(
    '../src/renderer/components/SearchDialog/components/SearchInputBar.tsx',
    import.meta.url
  ),
  'utf8'
)

const searchResultRowSource = readFileSync(
  new URL(
    '../src/renderer/components/SearchDialog/components/SearchResultRow.tsx',
    import.meta.url
  ),
  'utf8'
)

test('song search uses builtin providers instead of lx runtime search', () => {
  assert.match(dialogSource, /searchSongsWithBuiltinProvider/)
  assert.match(dialogSource, /createBuiltinSearchSourceTabs/)
  assert.doesNotMatch(dialogSource, /searchSongsWithLxMusicSource/)
  assert.doesNotMatch(dialogSource, /resolveLxSearchSourceTabs/)
  assert.doesNotMatch(dialogSource, /useConfigStore/)
})

test('search input bar keeps builtin source tabs and removes quality controls', () => {
  assert.match(inputBarSource, /searchSourceTabs/)
  assert.match(inputBarSource, /onSourceChange/)
  assert.doesNotMatch(inputBarSource, /onLxSearchQualityChange/)
  assert.doesNotMatch(inputBarSource, /LX_SEARCH_QUALITY_LEVELS/)
})

test('song search result row omits cover artwork for platform consistency', () => {
  assert.doesNotMatch(searchResultRowSource, /useState/)
  assert.doesNotMatch(searchResultRowSource, /onError=\{\(\) =>/)
  assert.doesNotMatch(searchResultRowSource, /No Cover/)
  assert.doesNotMatch(searchResultRowSource, /resizeImageUrl/)
  assert.match(searchResultRowSource, /durationLabel/)
  assert.match(searchResultRowSource, /qualityLabel/)
  assert.match(
    searchResultRowSource,
    /grid-cols-\[minmax\(0,1fr\)_120px_64px\]/
  )
})
