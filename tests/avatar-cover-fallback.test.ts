import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const avatarCoverSource = fs.readFileSync(
  path.join(process.cwd(), 'src/renderer/components/AvatarCover/index.tsx'),
  'utf8'
)

test('AvatarCover falls back to a default pattern when the image url is empty or fails to load', () => {
  assert.match(avatarCoverSource, /onError=\{\(\) => setHasLoadError\(true\)\}/)
  assert.match(avatarCoverSource, /shouldRenderFallback/)
  assert.match(avatarCoverSource, /DEFAULT_AVATAR_COVER_BACKGROUND/)
  assert.match(
    avatarCoverSource,
    /<Music2 className='size-\[42%\] text-white\/82'/
  )
})
