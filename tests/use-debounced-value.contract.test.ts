import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const hookSource = readFileSync(
  new URL('../src/renderer/hooks/useDebouncedValue.ts', import.meta.url),
  'utf8'
)

test('useDebouncedValue exposes a reusable debounced state hook', () => {
  assert.match(hookSource, /export function useDebouncedValue/)
  assert.match(hookSource, /setTimeout/)
  assert.match(hookSource, /clearTimeout/)
  assert.match(hookSource, /useEffect/)
  assert.match(hookSource, /useState/)
})
