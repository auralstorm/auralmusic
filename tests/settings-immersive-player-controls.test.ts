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

const playerSceneSource = readFileSync(
  new URL('../src/renderer/components/PlayerScene/index.tsx', import.meta.url),
  'utf8'
)

const playerSceneChromeButtonSource = readFileSync(
  new URL(
    '../src/renderer/components/PlayerScene/PlayerSceneChromeButton.tsx',
    import.meta.url
  ),
  'utf8'
)

test('basic settings exposes immersive player controls toggle', () => {
  assert.match(basicSettingsSource, /immersivePlayerControls/)
  assert.match(basicSettingsSource, /setConfig\('immersivePlayerControls'/)
  assert.match(basicSettingsSource, /沉浸式播放器/)
})

test('player scene reads immersive player controls and wraps chrome buttons', () => {
  assert.match(playerSceneSource, /immersivePlayerControls/)
  assert.match(playerSceneSource, /usePlayerSceneChromeVisibility/)
  assert.match(playerSceneSource, /PlayerSceneChromeButton/)
  assert.match(
    playerSceneSource,
    /onPointerMove=\{handleChromePointerActivity\}/
  )
})

test('player scene keeps chrome button props stable across playback progress updates', () => {
  assert.match(playerSceneSource, /const handleClose = useCallback\(/)
  assert.match(
    playerSceneSource,
    /const handleToggleFullscreen = useCallback\(/
  )
  assert.match(playerSceneSource, /const fullscreenToggleIcon = useMemo\(/)
  assert.match(playerSceneSource, /const closeIcon = useMemo\(/)
  assert.match(playerSceneSource, /\{fullscreenToggleIcon\}/)
  assert.match(playerSceneSource, /\{closeIcon\}/)
})

test('player scene chrome buttons fade without shifting position', () => {
  assert.match(playerSceneChromeButtonSource, /opacity-0/)
  assert.match(playerSceneChromeButtonSource, /opacity-100/)
  assert.doesNotMatch(playerSceneChromeButtonSource, /-translate-y-/)
  assert.doesNotMatch(playerSceneChromeButtonSource, /translate-y-0/)
})
