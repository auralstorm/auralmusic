import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const trackListSource = readFileSync(
  new URL(
    '../src/renderer/pages/LocalLibrary/components/LocalLibraryTrackList.tsx',
    import.meta.url
  ),
  'utf8'
)

const rowActionsSource = readFileSync(
  new URL(
    '../src/renderer/pages/LocalLibrary/components/LocalLibraryTrackRowActions.tsx',
    import.meta.url
  ),
  'utf8'
)

test('local library track list renders audio format as a dedicated column', () => {
  assert.match(
    trackListSource,
    /import\s+\{\s*Virtuoso\s*\}\s+from\s+'react-virtuoso'/
  )
  assert.match(trackListSource, /track\.audioFormat/)
  assert.match(trackListSource, /endReached=\{\(\)\s*=>/)
  assert.match(trackListSource, /tracks\.length < totalCount/)
  assert.match(
    trackListSource,
    /grid-cols-\[minmax\(0,2\.3fr\)_minmax\(0,1\.2fr\)_88px_88px\]/
  )
  assert.match(trackListSource, />格式</)
  assert.match(trackListSource, />操作</)
})

test('local library track list keeps only icon play action', () => {
  assert.match(trackListSource, /LocalLibraryTrackRowActions/)
  assert.match(
    trackListSource,
    /disabled=\{deletingTrackPath === track\.filePath\}/
  )
  assert.match(trackListSource, /onRevealTrack=\{onRevealTrack\}/)
  assert.match(trackListSource, /onAddToPlaylist=\{onAddToPlaylist\}/)
  assert.match(trackListSource, /onRemoveFromPlaylist=\{onRemoveFromPlaylist\}/)
  assert.match(trackListSource, /onDelete=\{onDeleteTrack\}/)
})

const pageSource = readFileSync(
  new URL('../src/renderer/pages/LocalLibrary/index.tsx', import.meta.url),
  'utf8'
)

test('local library delete actions execute directly without a confirm dialog layer', () => {
  assert.match(pageSource, /await executeDeleteTrack\(track, mode\)/)
  assert.doesNotMatch(pageSource, /LocalLibraryTrackDeleteDialog/)
  assert.doesNotMatch(pageSource, /pendingPermanentDeleteTrack/)
})

test('local library row actions use more trigger and open folder before delete actions', () => {
  assert.match(rowActionsSource, /aria-label=\{`更多操作 \$\{track\.title\}`\}/)
  assert.match(rowActionsSource, /<MoreHorizontal className='size-3\.5' \/>/)
  assert.match(
    rowActionsSource,
    /打开所在位置[\s\S]*添加到歌单[\s\S]*移出歌单[\s\S]*本地删除[\s\S]*彻底删除/
  )
  assert.match(rowActionsSource, /<FolderOpen className='size-4' \/>/)
  assert.match(rowActionsSource, /<ListPlus className='size-4' \/>/)
  assert.match(rowActionsSource, /<ListMinus className='size-4' \/>/)
  assert.match(rowActionsSource, /<Trash className='size-4' \/>/)
})

test('local library page reveals the active file through preload api', () => {
  assert.match(pageSource, /localLibraryApi\?\.revealTrack/)
  assert.match(pageSource, /localLibraryApi\.revealTrack\(track\.filePath\)/)
})

test('local library song tab resolves playback start by selected file path', () => {
  assert.match(pageSource, /const selectedTrack = tracks\[startIndex\]/)
  assert.match(
    pageSource,
    /queryAllTrackPages\(\s*debouncedKeyword,\s*songScope,\s*200\s*\)/
  )
  assert.match(
    pageSource,
    /queueTracks\.findIndex\(\s*track => track\.filePath === selectedTrack\.filePath\s*\)/
  )
  assert.match(
    pageSource,
    /buildLocalLibraryPlaybackQueue\(queueTracks, sourceKey\)/
  )
})
