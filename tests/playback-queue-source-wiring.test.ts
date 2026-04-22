import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const playlistPageSource = readFileSync(
  new URL('../src/renderer/pages/PlayList/index.tsx', import.meta.url),
  'utf8'
)
const allPlaylistSource = readFileSync(
  new URL(
    '../src/renderer/pages/PlayList/components/AllPlayList/index.tsx',
    import.meta.url
  ),
  'utf8'
)
const playlistDetailSource = readFileSync(
  new URL('../src/renderer/pages/PlayList/Detail/index.tsx', import.meta.url),
  'utf8'
)
const likedSongsPanelSource = readFileSync(
  new URL(
    '../src/renderer/pages/LikedSongs/components/LikedSongsTrackPanel.tsx',
    import.meta.url
  ),
  'utf8'
)
const drawerSource = readFileSync(
  new URL(
    '../src/renderer/components/PlaybackQueueDrawer/index.tsx',
    import.meta.url
  ),
  'utf8'
)

test('playlist playback entry points preserve playlist queue source ids', () => {
  assert.match(playlistPageSource, /createPlaylistQueueSourceKey/)
  assert.match(
    playlistPageSource,
    /playQueueFromIndex\(queue,\s*0,\s*createPlaylistQueueSourceKey\(playlistId\)\)/
  )

  assert.match(allPlaylistSource, /createPlaylistQueueSourceKey/)
  assert.match(
    allPlaylistSource,
    /playQueueFromIndex\(queue,\s*0,\s*createPlaylistQueueSourceKey\(playListId\)\)/
  )

  assert.match(playlistDetailSource, /createPlaylistQueueSourceKey/)
  assert.match(
    playlistDetailSource,
    /playQueueFromIndex\(state\.tracks,\s*0,\s*playbackQueueKey\)/
  )
  assert.match(
    playlistDetailSource,
    /<TrackList data=\{state\.tracks\} playbackQueueKey=\{playbackQueueKey\}/
  )

  assert.match(likedSongsPanelSource, /createPlaylistQueueSourceKey/)
  assert.match(likedSongsPanelSource, /playbackQueueKey=\{playbackQueueKey\}/)
})

test('playback queue drawer hydrates playlist queues once and reuses cached results', () => {
  assert.match(drawerSource, /getPlaylistTracks/)
  assert.match(drawerSource, /resolvePlaylistIdFromQueueSourceKey/)
  assert.match(drawerSource, /playlistQueueCacheRef/)
  assert.match(drawerSource, /new Map<number,\s*PlaybackTrack\[\]>\(\)/)
  assert.match(drawerSource, /syncQueueFromSource/)
  assert.match(
    drawerSource,
    /playQueueFromIndex\(queue,\s*index,\s*queueSourceKey\s*\?\?\s*null\)/
  )
})
