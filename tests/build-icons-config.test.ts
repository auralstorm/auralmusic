import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const electronBuilderConfig = readFileSync(
  new URL('../electron-builder.yml', import.meta.url),
  'utf8'
)

test('electron-builder packages build icons for runtime tray usage', () => {
  assert.match(electronBuilderConfig, /^extraResources:\s*$/m)
  assert.match(electronBuilderConfig, /^\s+-\s+from:\s+build\/icons\s*$/m)
  assert.match(electronBuilderConfig, /^\s+to:\s+build\/icons\s*$/m)
})
