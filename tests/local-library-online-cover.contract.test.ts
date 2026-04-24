import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    'src/main/local-library/local-library-online-lyric.service.ts'
  ),
  'utf8'
)

test('online local metadata service does not reject cover-only matches', () => {
  assert.match(
    source,
    /if\s*\(\s*!lyricBundle\.lyricText\s*&&\s*!lyricBundle\.translatedLyricText\s*&&\s*!remoteCoverUrl\.trim\(\)\s*\)/
  )
})
