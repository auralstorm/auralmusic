import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const layoutSource = readFileSync(
  new URL(
    '../src/renderer/pages/LocalLibraryDetail/components/LocalLibraryEntityDetailLayout.tsx',
    import.meta.url
  ),
  'utf8'
)

const heroSource = readFileSync(
  new URL(
    '../src/renderer/pages/LocalLibraryDetail/components/LocalLibraryEntityDetailHero.tsx',
    import.meta.url
  ),
  'utf8'
)

test('local library entity detail layout exposes shared shell and hero contracts', () => {
  assert.match(layoutSource, /backLabel/)
  assert.match(layoutSource, /children/)
  assert.match(layoutSource, /hero/)
  assert.match(heroSource, /coverUrl/)
  assert.match(heroSource, /metaItems/)
  assert.match(heroSource, /actions/)
})
