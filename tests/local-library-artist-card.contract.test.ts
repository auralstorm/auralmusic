import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const pageSource = readFileSync(
  new URL('../src/renderer/pages/LocalLibrary/index.tsx', import.meta.url),
  'utf8'
)

const artistCardSourcePath = new URL(
  '../src/renderer/pages/LocalLibrary/components/LocalLibraryArtistCard.tsx',
  import.meta.url
)

test('local library page delegates artist rendering to a dedicated artist card component', () => {
  assert.match(
    pageSource,
    /import\s+LocalLibraryArtistCard\s+from\s+'\.\/components\/LocalLibraryArtistCard'/
  )
  assert.match(pageSource, /<LocalLibraryArtistCard/)
})

test('local library artist card renders cover-driven layout with hover play affordance', () => {
  const artistCardSource = readFileSync(artistCardSourcePath, 'utf8')

  assert.match(artistCardSource, /AvatarCover/)
  assert.match(artistCardSource, /Play/)
  assert.match(artistCardSource, /group-hover:opacity-100/)
  assert.match(artistCardSource, /artist\.coverUrl/)
  assert.match(artistCardSource, /artist\.trackCount/)
})
