import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const routerSource = readFileSync(
  new URL('../src/renderer/router/router.config.tsx', import.meta.url),
  'utf8'
)

const routeComponentsSource = readFileSync(
  new URL('../src/renderer/router/routeComponents.tsx', import.meta.url),
  'utf8'
)

const albumPageSource = readFileSync(
  new URL(
    '../src/renderer/pages/LocalLibraryAlbumDetail/index.tsx',
    import.meta.url
  ),
  'utf8'
)

const artistPageSource = readFileSync(
  new URL(
    '../src/renderer/pages/LocalLibraryArtistDetail/index.tsx',
    import.meta.url
  ),
  'utf8'
)

const localLibraryPageSource = readFileSync(
  new URL('../src/renderer/pages/LocalLibrary/index.tsx', import.meta.url),
  'utf8'
)

test('album and artist detail routes point to standalone local detail pages', () => {
  assert.match(
    routerSource,
    /path:\s*'\/local-library\/albums\/:albumName\/:artistName'/
  )
  assert.match(routerSource, /element:\s*<LocalLibraryAlbumDetail\s*\/>/)
  assert.match(routerSource, /path:\s*'\/local-library\/artists\/:artistName'/)
  assert.match(routerSource, /element:\s*<LocalLibraryArtistDetail\s*\/>/)
  assert.match(routeComponentsSource, /LocalLibraryAlbumDetail/)
  assert.match(routeComponentsSource, /LocalLibraryArtistDetail/)
})

test('album detail page uses local detail layout and scoped track querying', () => {
  assert.match(albumPageSource, /LocalLibraryEntityDetailLayout/)
  assert.match(albumPageSource, /LocalLibraryEntityDetailHero/)
  assert.match(albumPageSource, /useParams/)
  assert.match(albumPageSource, /useDebouncedValue/)
  assert.match(
    albumPageSource,
    /const debouncedKeyword = useDebouncedValue\(keyword/
  )
  assert.match(albumPageSource, /queryAllAlbumPages/)
  assert.match(albumPageSource, /localLibraryApi\.queryTracks\(/)
  assert.match(albumPageSource, /keyword:\s*debouncedKeyword/)
  assert.match(albumPageSource, /scopeType:\s*'album'/)
  assert.match(albumPageSource, /createLocalLibraryAlbumQueueSourceKey/)
  assert.match(albumPageSource, /LocalLibraryTrackList/)
  assert.match(albumPageSource, /const albumRef = useRef\(album\)/)
  assert.match(albumPageSource, /albumRef\.current = album/)
  assert.match(
    albumPageSource,
    /loadedAlbumKeyRef = useRef<string \| null>\(null\)/
  )
  assert.match(
    albumPageSource,
    /if \(isSwitchingAlbum\) {\s*setIsInitialLoading\(true\)/s
  )
  assert.doesNotMatch(
    albumPageSource,
    /\[album,\s*decodedAlbumName,\s*decodedArtistName,\s*isValidAlbumDetail,\s*keyword\]/
  )
})

test('artist detail page uses local detail layout and scoped track querying', () => {
  assert.match(artistPageSource, /LocalLibraryEntityDetailLayout/)
  assert.match(artistPageSource, /LocalLibraryEntityDetailHero/)
  assert.match(artistPageSource, /useParams/)
  assert.match(artistPageSource, /useDebouncedValue/)
  assert.match(
    artistPageSource,
    /const debouncedKeyword = useDebouncedValue\(keyword/
  )
  assert.match(artistPageSource, /queryAllArtistPages/)
  assert.match(artistPageSource, /localLibraryApi\.queryTracks\(/)
  assert.match(artistPageSource, /keyword:\s*debouncedKeyword/)
  assert.match(artistPageSource, /scopeType:\s*'artist'/)
  assert.match(artistPageSource, /createLocalLibraryArtistQueueSourceKey/)
  assert.match(artistPageSource, /LocalLibraryTrackList/)
  assert.match(artistPageSource, /const artistRef = useRef\(artist\)/)
  assert.match(artistPageSource, /artistRef\.current = artist/)
  assert.match(
    artistPageSource,
    /loadedArtistKeyRef = useRef<string \| null>\(null\)/
  )
  assert.match(
    artistPageSource,
    /if \(isSwitchingArtist\) {\s*setIsInitialLoading\(true\)/s
  )
  assert.doesNotMatch(
    artistPageSource,
    /\[artist,\s*decodedArtistName,\s*isValidArtistDetail,\s*keyword\]/
  )
})

test('local library cards navigate to standalone album and artist routes', () => {
  assert.match(
    localLibraryPageSource,
    /const handleOpenAlbum[\s\S]*navigate\(\s*`\/local-library\/albums\/\$\{encodeURIComponent\(album\.name\)\}\/\$\{encodeURIComponent\(album\.artistName\)\}`\s*\)/
  )
  assert.match(
    localLibraryPageSource,
    /const handleOpenArtist[\s\S]*navigate\(\s*`\/local-library\/artists\/\$\{encodeURIComponent\(artist\.name\)\}`\s*\)/
  )
})
