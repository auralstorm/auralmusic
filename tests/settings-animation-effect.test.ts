import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const basicSettingsSource = readFileSync(
  new URL(
    '../src/renderer/pages/Settings/components/BasicSettings.tsx',
    import.meta.url
  ),
  'utf8'
)

const appLayoutSource = readFileSync(
  new URL('../src/renderer/layout/AppLayout.tsx', import.meta.url),
  'utf8'
)

const globalsSource = readFileSync(
  new URL('../src/renderer/styles/globals.css', import.meta.url),
  'utf8'
)

test('basic settings exposes animation effect selection', () => {
  assert.match(basicSettingsSource, /ANIMATION_EFFECT_OPTIONS/)
  assert.match(basicSettingsSource, /animationEffect/)
  assert.match(basicSettingsSource, /setConfig\('animationEffect'/)
  assert.match(basicSettingsSource, /动画效果/)
})

test('app layout applies animation effect preference globally', () => {
  assert.match(
    appLayoutSource,
    /import\s+\{\s*useAnimationEffect\s*\}\s+from\s+'@\/hooks\/useAnimationEffect'/
  )
  assert.match(appLayoutSource, /useAnimationEffect\(\)/)
})

test('global styles define reduced and off animation behavior', () => {
  assert.match(globalsSource, /\[data-animation-effect='reduced'\]/)
  assert.match(globalsSource, /\[data-animation-effect='off'\]/)
  assert.match(globalsSource, /transition-duration:\s*0ms\s*!important/)
  assert.match(globalsSource, /\.bg-animate/)
  assert.match(globalsSource, /\.player-scene-artwork-shell\.is-breathing/)
  assert.match(globalsSource, /\.player-vinyl-record/)
})
