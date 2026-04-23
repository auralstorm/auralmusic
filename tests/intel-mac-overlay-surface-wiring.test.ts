import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('globals.css defines intel mac overlay and surface overrides for dialog and drawer slots', async () => {
  const globalsSource = await readFile(
    new URL('../src/renderer/styles/globals.css', import.meta.url),
    'utf8'
  )

  assert.match(globalsSource, /\[data-slot='drawer-overlay'\]/)
  assert.match(globalsSource, /\[data-slot='dialog-overlay'\]/)
  assert.match(globalsSource, /\[data-slot='drawer-content'\]/)
  assert.match(globalsSource, /\[data-slot='dialog-content'\]/)
})
