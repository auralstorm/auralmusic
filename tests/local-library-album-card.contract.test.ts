import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const pageSource = readFileSync(
  new URL('../src/renderer/pages/LocalLibrary/index.tsx', import.meta.url),
  'utf8'
)

const albumCardSourcePath = new URL(
  '../src/renderer/pages/LocalLibrary/components/LocalLibraryAlbumCard.tsx',
  import.meta.url
)

test('local library page delegates album rendering to a dedicated album card component', () => {
  assert.match(
    pageSource,
    /import\s+LocalLibraryAlbumCard\s+from\s+'\.\/components\/LocalLibraryAlbumCard'/
  )
  assert.match(pageSource, /<LocalLibraryAlbumCard/)
})

test('local library album card renders cover-driven layout with hover play affordance', () => {
  const albumCardSource = readFileSync(albumCardSourcePath, 'utf8')

  assert.match(albumCardSource, /AvatarCover/)
  assert.match(albumCardSource, /Play/)
  assert.match(albumCardSource, /group-hover:opacity-100/)
  assert.match(albumCardSource, /album\.coverUrl/)
  assert.match(albumCardSource, /album\.trackCount/)
})
