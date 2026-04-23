import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const playSettingsSource = readFileSync(
  new URL(
    '../src/renderer/pages/Settings/components/PlaySettings.tsx',
    import.meta.url
  ),
  'utf8'
)

test('play settings expose retro cover preset selector with full option set', () => {
  assert.match(playSettingsSource, /复古封面质感/)
  assert.match(playSettingsSource, /RETRO_COVER_PRESET_OPTIONS/)
  assert.match(
    playSettingsSource,
    /import\s*\{[\s\S]*RETRO_COVER_PRESET_OPTIONS[\s\S]*\}\s*from '\.\.\/\.\.\/\.\.\/\.\.\/shared\/config\.ts'/
  )
  assert.doesNotMatch(playSettingsSource, /const RETRO_COVER_PRESET_OPTIONS/)
})
