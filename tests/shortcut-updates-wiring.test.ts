import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('shortcut bridge dispatches the new shortcut actions', async () => {
  const bridgeSource = await readFile(
    new URL(
      '../src/renderer/components/PlaybackShortcutBridge/index.tsx',
      import.meta.url
    ),
    'utf8'
  )

  assert.match(bridgeSource, /actionId === 'toggleFullscreen'/)
  assert.match(bridgeSource, /actionId === 'toggleSearch'/)
  assert.match(bridgeSource, /actionId === 'navigateBack'/)
  assert.match(bridgeSource, /actionId === 'navigateForward'/)
  assert.match(bridgeSource, /actionId === 'togglePlaylist'/)
})

test('settings labels expose the renamed and new shortcut actions', async () => {
  const settingsSource = await readFile(
    new URL(
      '../src/renderer/pages/Settings/components/ShortcutKeySettings.tsx',
      import.meta.url
    ),
    'utf8'
  )

  assert.match(settingsSource, /toggleSearch: '显示\/隐藏搜索'/)
  assert.match(settingsSource, /toggleFullscreen: '全屏\/非全屏'/)
  assert.match(settingsSource, /navigateBack: '后退'/)
  assert.match(settingsSource, /navigateForward: '前进'/)
  assert.match(settingsSource, /togglePlaylist: '显示\/隐藏播放列表'/)
})

test('search dialog and playback control consume shared visibility stores', async () => {
  const [searchDialogSource, playbackControlSource] = await Promise.all([
    readFile(
      new URL(
        '../src/renderer/components/SearchDialog/index.tsx',
        import.meta.url
      ),
      'utf8'
    ),
    readFile(
      new URL(
        '../src/renderer/components/PlaybackControl/index.tsx',
        import.meta.url
      ),
      'utf8'
    ),
  ])

  assert.match(searchDialogSource, /useSearchDialogStore/)
  assert.match(searchDialogSource, /toggleDialog/)
  assert.match(playbackControlSource, /usePlaybackQueueDrawerStore/)
  assert.match(playbackControlSource, /openDrawer/)
  assert.match(playbackControlSource, /setOpen/)
})
