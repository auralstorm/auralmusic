import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const routerSource = readFileSync(
  new URL('../src/renderer/router/router.config.tsx', import.meta.url),
  'utf8'
)

const settingsSource = readFileSync(
  new URL('../src/renderer/pages/Settings/index.tsx', import.meta.url),
  'utf8'
)

test('router declares local library as a first-level route', () => {
  assert.match(routerSource, /path:\s*'\/local-library'/)
  assert.match(routerSource, /meta:\s*\{\s*title:\s*'本地乐库'/)
})

test('settings page declares and mounts local library tab', () => {
  assert.match(
    settingsSource,
    /import\s+LocalLibrarySettings\s+from\s+'\.\/components\/LocalLibrarySettings'/
  )
  assert.match(
    settingsSource,
    /\{\s*label:\s*'本地乐库'\s*,\s*value:\s*'localLibrary'\s*\}/
  )
  assert.match(
    settingsSource,
    /<TabsContent\s+value='localLibrary'>\s*<LocalLibrarySettings\s*\/>\s*<\/TabsContent>/
  )
})
