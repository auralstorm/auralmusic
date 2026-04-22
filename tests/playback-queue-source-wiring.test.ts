import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const sharedPlaybackSource = readFileSync(
  new URL('../src/shared/playback.ts', import.meta.url),
  'utf8'
)
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
const hydrationModelSource = readFileSync(
  new URL(
    '../src/renderer/model/playback-queue-hydration.model.ts',
    import.meta.url
  ),
  'utf8'
)

test('shared playback helpers expose typed queue source helpers', () => {
  assert.match(
    sharedPlaybackSource,
    /const\s+PLAYLIST_QUEUE_SOURCE_PREFIX\s*=\s*'playlist:'/
  )
  assert.match(
    sharedPlaybackSource,
    /const\s+LIKED_SONGS_QUEUE_SOURCE_PREFIX\s*=\s*'liked-songs:'/
  )
  assert.match(
    sharedPlaybackSource,
    /const\s+ALBUM_QUEUE_SOURCE_PREFIX\s*=\s*'album:'/
  )
  assert.match(
    sharedPlaybackSource,
    /const\s+CLOUD_QUEUE_SOURCE_PREFIX\s*=\s*'cloud:'/
  )
  assert.match(
    sharedPlaybackSource,
    /export function createLikedSongsQueueSourceKey/
  )
  assert.match(
    sharedPlaybackSource,
    /export function createAlbumQueueSourceKey/
  )
  assert.match(
    sharedPlaybackSource,
    /export function createCloudQueueSourceKey/
  )
  assert.match(
    sharedPlaybackSource,
    /export function resolveQueueSourceDescriptor/
  )
})

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
  assert.match(playlistDetailSource, /ensureQueueSourceHydration/)
  assert.match(
    playlistDetailSource,
    /void ensureQueueSourceHydration\(\{\s*sourceKey:\s*playbackQueueKey,\s*seedQueue:\s*state\.tracks,\s*startOffset:\s*state\.tracks\.length/
  )
  assert.match(
    playlistDetailSource,
    /<TrackList[\s\S]*data=\{state\.tracks\}[\s\S]*playbackQueueKey=\{playbackQueueKey\}/
  )

  assert.match(likedSongsPanelSource, /createLikedSongsQueueSourceKey/)
  assert.match(likedSongsPanelSource, /playbackQueueKey=\{playbackQueueKey\}/)
})

test('playback queue drawer hydrates source queues once and reuses cached results', () => {
  assert.match(drawerSource, /ensureQueueSourceHydration/)
  assert.match(drawerSource, /getCachedQueueSource/)
  assert.match(drawerSource, /resolveQueueSourceDescriptor/)
  assert.match(drawerSource, /syncQueueFromSource/)
  assert.match(
    drawerSource,
    /\[open,\s*queueSourceKey,\s*syncQueueFromSource\]/
  )
  assert.doesNotMatch(drawerSource, /\[open,\s*queue,\s*queueSourceKey/)
  assert.match(drawerSource, /playCurrentQueueIndex\(index\)/)
  assert.match(
    hydrationModelSource,
    /const\s+PLAYLIST_QUEUE_HYDRATE_LIMIT\s*=\s*1000/
  )
  assert.match(hydrationModelSource, /resolveQueueSourceDescriptor/)
  assert.match(
    hydrationModelSource,
    /const\s+playbackQueueCache\s*=\s*new Map<string,\s*PlaybackTrack\[\]>\(\)/
  )
  assert.match(
    hydrationModelSource,
    /const\s+playbackQueueInflightTasks\s*=\s*new Map<string,\s*Promise<PlaybackTrack\[\]>>\(\)/
  )
  assert.match(hydrationModelSource, /case\s+'playlist'/)
  assert.match(hydrationModelSource, /case\s+'liked-songs'/)
  assert.match(hydrationModelSource, /case\s+'album'/)
  assert.match(hydrationModelSource, /case\s+'cloud'/)
  assert.match(
    hydrationModelSource,
    /for\s*\(\s*let offset = startOffset;\s*;\s*offset \+= PLAYLIST_QUEUE_HYDRATE_LIMIT\s*\)/
  )
})
