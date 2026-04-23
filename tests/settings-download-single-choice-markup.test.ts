import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const downloadSettingsSource = readFileSync(
  new URL(
    '../src/renderer/pages/Settings/components/DownloadSettings.tsx',
    import.meta.url
  ),
  'utf8'
)

test('download settings single choice card avoids nested button markup', () => {
  assert.match(downloadSettingsSource, /<div[\s\S]*role='radio'/)
  assert.doesNotMatch(downloadSettingsSource, /<button[^>]*role='radio'/)
  assert.match(
    downloadSettingsSource,
    /<Checkbox[\s\S]*aria-hidden[\s\S]*className='pointer-events-none mt-0.5'/
  )
})

test('download settings single choice card remains keyboard selectable', () => {
  assert.match(
    downloadSettingsSource,
    /if \(event\.key === 'Enter' \|\| event\.key === ' '\)/
  )
  assert.match(downloadSettingsSource, /onKeyDown=\{handleKeyDown\}/)
})
