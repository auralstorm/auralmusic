import assert from 'node:assert/strict'
import test from 'node:test'

import { createTrayController } from '../src/main/tray/tray-controller.ts'

function findMenuItemByLabel(items: any[], label: string): any {
  return items.find(item => item?.label === label)
}

test('createTrayController builds playback menu and dispatches tray commands', () => {
  const contextMenus: any[] = []
  const listeners = new Map<string, () => void>()
  const commands: unknown[] = []
  const iconPaths: string[] = []
  let showWindowCalls = 0
  let quitCalls = 0

  const tray = {
    setToolTip: () => undefined,
    setContextMenu: (menu: unknown) => {
      contextMenus.push(menu)
    },
    on: (event: string, handler: () => void) => {
      listeners.set(event, handler)
    },
    destroy: () => undefined,
  }

  const controller = createTrayController({
    Tray: class {
      constructor() {
        return tray
      }
    } as never,
    Menu: {
      buildFromTemplate: template => ({ template }),
    } as never,
    nativeImage: {
      createFromPath: (iconPath: string) => {
        iconPaths.push(iconPath)
        return {
          isEmpty: () => false,
          setTemplateImage: () => undefined,
        }
      },
      createFromDataURL: () => ({
        isEmpty: () => false,
        setTemplateImage: () => undefined,
      }),
    } as never,
    appPath: 'F:\\code-demo\\AuralMusic',
    resourcesPath: 'F:\\code-demo\\AuralMusic',
    pathExists: iconPath => iconPath.endsWith('build\\icons\\icon.ico'),
    platform: 'win32',
    showMainWindow: () => {
      showWindowCalls += 1
    },
    quitApp: () => {
      quitCalls += 1
    },
    sendCommand: command => {
      commands.push(command)
    },
  })

  controller.initialize()
  assert.equal(
    iconPaths.at(-1),
    'F:\\code-demo\\AuralMusic\\build\\icons\\icon.ico'
  )
  controller.setState({
    currentTrackName: 'Song',
    currentArtistNames: 'Artist',
    status: 'playing',
    playbackMode: 'shuffle',
    hasCurrentTrack: true,
  })

  const latestTemplate = contextMenus.at(-1)?.template ?? []
  assert.equal(
    findMenuItemByLabel(latestTemplate, 'Song - Artist')?.enabled,
    false
  )
  assert.equal(findMenuItemByLabel(latestTemplate, '暂停')?.enabled, true)
  assert.equal(findMenuItemByLabel(latestTemplate, '上一首')?.enabled, true)
  assert.equal(findMenuItemByLabel(latestTemplate, '下一首')?.enabled, true)

  const playbackModeMenu = findMenuItemByLabel(latestTemplate, '单曲循环')
  assert.equal(
    findMenuItemByLabel(playbackModeMenu.submenu, '随机播放')?.checked,
    true
  )

  findMenuItemByLabel(latestTemplate, '暂停')?.click()
  findMenuItemByLabel(latestTemplate, '上一首')?.click()
  findMenuItemByLabel(latestTemplate, '下一首')?.click()
  findMenuItemByLabel(playbackModeMenu.submenu, '列表循环')?.click()
  findMenuItemByLabel(latestTemplate, '设置')?.click()
  findMenuItemByLabel(latestTemplate, '退出')?.click()
  listeners.get('click')?.()
  listeners.get('double-click')?.()

  assert.deepEqual(commands, [
    { type: 'toggle-play' },
    { type: 'play-previous' },
    { type: 'play-next' },
    { type: 'set-playback-mode', playbackMode: 'repeat-all' },
    { type: 'open-settings' },
  ])
  assert.equal(showWindowCalls, 3)
  assert.equal(quitCalls, 1)
})
