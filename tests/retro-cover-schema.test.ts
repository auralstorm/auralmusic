import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const configStoreSource = readFileSync(
  new URL('../src/main/config/store.ts', import.meta.url),
  'utf8'
)

test('main config schema supports all retro cover preset values', () => {
  assert.match(configStoreSource, /retroCoverPreset:\s*\{/)
  assert.match(configStoreSource, /enum:\s*RETRO_COVER_PRESETS/)
})
