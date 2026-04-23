import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const newAlbumListSource = readFileSync(
  new URL(
    '../src/renderer/pages/Home/components/NewAlbumList.tsx',
    import.meta.url
  ),
  'utf8'
)

const artistCoverSource = readFileSync(
  new URL('../src/renderer/components/ArtistCover/index.tsx', import.meta.url),
  'utf8'
)

test('home new album list supports artist subtitle navigation to artist detail', () => {
  assert.match(newAlbumListSource, /useNavigate/)
  assert.match(newAlbumListSource, /navigateToArtistDetail/)
  assert.match(newAlbumListSource, /navigate\(`\/artists\/\$\{artistId\}`\)/)
  assert.match(
    newAlbumListSource,
    /<ArtistCover[\s\S]*onClickSubTitle=\{\(\)\s*=>\s*navigateToArtistDetail\(item\.artist\?\.id\)\}/
  )
})

test('artist cover supports optional subtitle click callback without affecting default subtitle rendering', () => {
  assert.match(artistCoverSource, /onClickSubTitle/)
  assert.match(artistCoverSource, /<button[\s\S]*onClick=\{event\s*=>/)
  assert.match(artistCoverSource, /event\.stopPropagation\(\)/)
  assert.match(artistCoverSource, /onClickSubTitle\(\)/)
  assert.match(
    artistCoverSource,
    /<div className='text-foreground\/70 mt-1 truncate text-center text-\[14px\]'>/
  )
})
