import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('renderer entry applies runtime environment markers before rendering', async () => {
  const source = await readFile(
    new URL('../src/renderer/main.tsx', import.meta.url),
    'utf8'
  )

  assert.match(source, /applyRuntimeEnvironmentToRoot/)
  assert.match(source, /document\.documentElement/)
  assert.match(source, /getAppRuntime/)
})
