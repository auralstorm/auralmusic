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

const artworkSource = readFileSync(
  new URL(
    '../src/renderer/components/PlayerScene/PlayerSceneArtwork.tsx',
    import.meta.url
  ),
  'utf8'
)

const vinylArtworkSource = readFileSync(
  new URL(
    '../src/renderer/components/PlayerScene/artwork-styles/VinylRecordArtwork.tsx',
    import.meta.url
  ),
  'utf8'
)

const holographicCdArtworkSource = readFileSync(
  new URL(
    '../src/renderer/components/PlayerScene/artwork-styles/HolographicCdArtwork.tsx',
    import.meta.url
  ),
  'utf8'
)

const artworkRegistrySource = readFileSync(
  new URL(
    '../src/renderer/components/PlayerScene/artwork-styles/registry.ts',
    import.meta.url
  ),
  'utf8'
)

test('basic settings exposes player artwork style selection', () => {
  assert.match(basicSettingsSource, /PLAYER_ARTWORK_STYLE_OPTIONS/)
  assert.match(basicSettingsSource, /playerArtworkStyle/)
  assert.match(basicSettingsSource, /setConfig\('playerArtworkStyle'/)
  assert.match(basicSettingsSource, /播放器样式/)
})

test('player scene forwards artwork style into the artwork container', () => {
  assert.match(playerSceneSource, /state => state\.config\.playerArtworkStyle/)
  assert.match(playerSceneSource, /playerArtworkStyle=\{playerArtworkStyle\}/)
})

test('player artwork container resolves styles through the registry', () => {
  assert.match(artworkSource, /resolvePlayerArtworkStyleComponent/)
  assert.match(artworkSource, /shouldAnimateArtwork/)
})

test('vinyl artwork uses css rotation instead of Pixi cover rendering', () => {
  assert.match(vinylArtworkSource, /vinyl\.png/)
  assert.match(vinylArtworkSource, /player-rotating-disc/)
  assert.doesNotMatch(vinylArtworkSource, /PlayerScenePixiCover/)
})

test('holographic CD artwork is registered and preserves the template overlay', () => {
  assert.match(artworkRegistrySource, /holographicCd:\s*HolographicCdArtwork/)
  assert.match(holographicCdArtworkSource, /holographic\.png/)
  assert.match(holographicCdArtworkSource, /player-rotating-disc/)
  assert.match(holographicCdArtworkSource, /inset-\[17\.5%\]/)
  assert.match(holographicCdArtworkSource, /z-20/)
  assert.doesNotMatch(holographicCdArtworkSource, /PlayerScenePixiCover/)
})
