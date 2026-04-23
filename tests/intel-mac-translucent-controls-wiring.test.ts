import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('player scene, mv drawer, and login surfaces opt into intel mac contrast helper classes', async () => {
  const [
    playerSceneButton,
    mvDrawer,
    mvDrawerControlBar,
    qrLoginPanel,
    loginArtwork,
  ] = await Promise.all([
    readFile(
      new URL(
        '../src/renderer/components/PlayerScene/PlayerSceneChromeButton.tsx',
        import.meta.url
      ),
      'utf8'
    ),
    readFile(
      new URL('../src/renderer/components/MvDrawer/index.tsx', import.meta.url),
      'utf8'
    ),
    readFile(
      new URL(
        '../src/renderer/components/MvDrawer/components/MvDrawerControlBar.tsx',
        import.meta.url
      ),
      'utf8'
    ),
    readFile(
      new URL(
        '../src/renderer/components/LoginDialog/components/QrLoginPanel.tsx',
        import.meta.url
      ),
      'utf8'
    ),
    readFile(
      new URL(
        '../src/renderer/components/LoginDialog/components/LoginArtwork.tsx',
        import.meta.url
      ),
      'utf8'
    ),
  ])

  assert.match(playerSceneButton, /app-intel-dark-surface/)
  assert.match(mvDrawer, /app-intel-dark-surface/)
  assert.match(mvDrawerControlBar, /app-intel-dark-surface/)
  assert.match(qrLoginPanel, /app-intel-dark-surface/)
  assert.match(loginArtwork, /app-intel-light-surface/)
})

test('globals.css defines intel mac contrast overrides for dark and light helper surfaces', async () => {
  const globalsSource = await readFile(
    new URL('../src/renderer/styles/globals.css', import.meta.url),
    'utf8'
  )

  assert.match(globalsSource, /\.app-intel-dark-surface/)
  assert.match(globalsSource, /\.app-intel-light-surface/)
})
