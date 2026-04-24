import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const npmrcSource = readFileSync(new URL('../.npmrc', import.meta.url), 'utf8')
const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
) as {
  scripts?: Record<string, string>
}

test('npmrc pins mirror hosts for electron native dependencies', () => {
  assert.match(
    npmrcSource,
    /^better_sqlite3_binary_host=https:\/\/registry\.npmmirror\.com\/-\/binary\/better-sqlite3$/m
  )
  assert.match(
    npmrcSource,
    /^electron_builder_binaries_mirror=https:\/\/npmmirror\.com\/mirrors\/electron-builder-binaries\/$/m
  )
})

test('postinstall rebuilds native modules against the active electron runtime', () => {
  assert.equal(
    packageJson.scripts?.postinstall,
    'electron-builder install-app-deps'
  )
})
