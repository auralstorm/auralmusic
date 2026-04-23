import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const albumsPageSource = readFileSync(
  new URL('../src/renderer/pages/Albums/index.tsx', import.meta.url),
  'utf8'
)

test('albums page supports artist subtitle navigation to artist detail', () => {
  assert.match(albumsPageSource, /navigateToArtistDetail/)
  assert.match(albumsPageSource, /navigate\(`\/artists\/\$\{artistId\}`\)/)
  assert.match(albumsPageSource, /resolvePrimaryAlbumArtistId/)
  assert.match(
    albumsPageSource,
    /<ArtistCover[\s\S]*onClickSubTitle=\{\(\)\s*=>[\s\S]*navigateToArtistDetail\(resolvePrimaryAlbumArtistId\(item\)\)/
  )
})

test('albums page keeps subtitle text resilient when artist payload varies', () => {
  assert.match(albumsPageSource, /resolveAlbumArtistName/)
  assert.match(albumsPageSource, /item\.artist\?\.name/)
  assert.match(
    albumsPageSource,
    /item\.artists\?\.map\(artist\s*=>\s*artist\.name\)\.join\(' \/ '\)/
  )
})
