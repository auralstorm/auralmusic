import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const shortcutKeySettingsSource = readFileSync(
  new URL(
    '../src/renderer/pages/Settings/components/ShortcutKeySettings.tsx',
    import.meta.url
  ),
  'utf8'
)

test('shortcut settings marks failed global shortcut registrations with a soft error background', () => {
  assert.match(shortcutKeySettingsSource, /globalRegistrationStatuses/)
  assert.match(shortcutKeySettingsSource, /bg-red-50/)
  assert.match(shortcutKeySettingsSource, /registered === false/)
})
