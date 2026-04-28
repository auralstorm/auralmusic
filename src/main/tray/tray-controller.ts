import electron from 'electron'
import { existsSync } from 'node:fs'
import path from 'node:path'

import type { PlaybackMode } from '../../shared/playback.ts'
import type { TrayCommand, TrayState } from '../../shared/tray.ts'

type TrayLike = {
  setToolTip: (toolTip: string) => void
  setContextMenu: (menu: unknown) => void
  on: (event: 'click' | 'double-click', listener: () => void) => void
  destroy: () => void
}

type MenuLike = {
  buildFromTemplate: (template: unknown[]) => unknown
}

type NativeImageLike = {
  isEmpty?: () => boolean
  setTemplateImage?: (template: boolean) => void
}

type TrayConstructor = new (image: unknown) => TrayLike

type TrayControllerOptions = {
  Tray?: TrayConstructor
  Menu?: MenuLike
  nativeImage?: {
    createFromPath: (path: string) => NativeImageLike
    createFromDataURL: (dataUrl: string) => NativeImageLike
  }
  appPath?: string
  resourcesPath?: string
  pathExists?: (path: string) => boolean
  platform?: NodeJS.Platform
  showMainWindow: () => void
  quitApp: () => void
  sendCommand: (command: TrayCommand) => void
}

const DEFAULT_TRAY_STATE: TrayState = {
  currentTrackName: '',
  currentArtistNames: '',
  status: 'idle',
  playbackMode: 'repeat-all',
  hasCurrentTrack: false,
}

const TRAY_NOW_PLAYING_MAX_DISPLAY_UNITS = 30
const TRAY_LABEL_ELLIPSIS = '...'

/** 不同平台托盘图标格式不同，Windows 优先 ico，其它平台使用 png。 */
function getTrayIconFilename(platform: NodeJS.Platform) {
  if (platform === 'win32') {
    return path.join('build', 'icons', 'icon.ico')
  }

  return path.join('build', 'icons', 'png', '32x32.png')
}

/** 粗略按显示宽度计算字符占用，中文等宽字符按 2 个单位处理。 */
function getCharacterDisplayUnits(character: string) {
  return (character.codePointAt(0) ?? 0) > 0xff ? 2 : 1
}

function getTextDisplayUnits(text: string) {
  let total = 0

  for (const character of text) {
    total += getCharacterDisplayUnits(character)
  }

  return total
}

/** 截断托盘正在播放文案，防止系统菜单被超长歌名撑宽。 */
function truncateTrayLabel(
  text: string,
  maxDisplayUnits = TRAY_NOW_PLAYING_MAX_DISPLAY_UNITS
) {
  if (!text || maxDisplayUnits <= 0) {
    return ''
  }

  if (getTextDisplayUnits(text) <= maxDisplayUnits) {
    return text
  }

  const availableUnits = Math.max(
    maxDisplayUnits - TRAY_LABEL_ELLIPSIS.length,
    1
  )
  let usedUnits = 0
  let output = ''

  for (const character of text) {
    const units = getCharacterDisplayUnits(character)
    if (usedUnits + units > availableUnits) {
      break
    }

    output += character
    usedUnits += units
  }

  return `${output}${TRAY_LABEL_ELLIPSIS}`
}

/** 解析托盘图标路径，兼容开发目录和打包后的 resources 目录。 */
export function resolveTrayIconPath(options: {
  appPath: string
  resourcesPath: string
  platform: NodeJS.Platform
  pathExists: (path: string) => boolean
}) {
  const iconFilename = getTrayIconFilename(options.platform)
  const candidates = [
    path.join(options.resourcesPath, iconFilename),
    path.join(options.appPath, iconFilename),
  ]

  return candidates.find(options.pathExists) ?? candidates[0]
}

/** 图标文件缺失时生成兜底图标，避免 Tray 构造失败导致主进程启动失败。 */
function getFallbackTrayIcon(
  nativeImage: TrayControllerOptions['nativeImage'],
  platform: NodeJS.Platform
) {
  const iconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="16" fill="#111111"/>
      <path d="M18 36c3.5-7 7.5-11 14-11s10.5 4 14 11" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
      <circle cx="24" cy="40" r="4" fill="#ffffff"/>
      <circle cx="32" cy="27" r="4" fill="#ffffff"/>
      <circle cx="40" cy="40" r="4" fill="#ffffff"/>
    </svg>
  `

  const image = nativeImage?.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString('base64')}`
  )

  if (platform === 'darwin') {
    image?.setTemplateImage?.(true)
  }

  return image
}

/** 获取平台合适的托盘图标，macOS 下设置 template image 以适配系统深浅色。 */
function getTrayIcon(options: {
  nativeImage: TrayControllerOptions['nativeImage']
  platform: NodeJS.Platform
  appPath: string
  resourcesPath: string
  pathExists: (path: string) => boolean
}) {
  const iconPath = resolveTrayIconPath({
    appPath: options.appPath,
    resourcesPath: options.resourcesPath,
    platform: options.platform,
    pathExists: options.pathExists,
  })
  const image = options.nativeImage?.createFromPath(iconPath)

  if (image && !image.isEmpty?.()) {
    if (options.platform === 'darwin') {
      image.setTemplateImage?.(true)
    }

    return image
  }

  return getFallbackTrayIcon(options.nativeImage, options.platform)
}

/** 格式化托盘顶部“正在播放”文案。 */
function formatNowPlayingLabel(state: TrayState) {
  const title = state.currentTrackName.trim()
  const artist = state.currentArtistNames.trim()

  if (!title) {
    return 'AuralMusic'
  }

  return truncateTrayLabel(artist ? `${title} - ${artist}` : title)
}

/** 构造播放模式 radio 菜单项，点击后只发送托盘命令，不直接修改播放器状态。 */
function createPlaybackModeItem(
  label: string,
  playbackMode: PlaybackMode,
  currentMode: PlaybackMode,
  sendCommand: (command: TrayCommand) => void
) {
  return {
    label,
    type: 'radio',
    checked: currentMode === playbackMode,
    click: () => {
      sendCommand({
        type: 'set-playback-mode',
        playbackMode,
      })
    },
  }
}

/** 根据当前播放状态生成托盘菜单模板。 */
function buildTrayMenuTemplate(
  state: TrayState,
  options: Pick<
    TrayControllerOptions,
    'showMainWindow' | 'quitApp' | 'sendCommand'
  >
) {
  const hasCurrentTrack = state.hasCurrentTrack
  const isPlaying = state.status === 'playing' || state.status === 'loading'

  return [
    {
      label: formatNowPlayingLabel(state),
      enabled: false,
    },
    { type: 'separator' },
    {
      label: isPlaying ? '暂停' : '播放',
      enabled: hasCurrentTrack,
      click: () => {
        options.sendCommand({ type: 'toggle-play' })
      },
    },
    {
      label: '上一首',
      enabled: hasCurrentTrack,
      click: () => {
        options.sendCommand({ type: 'play-previous' })
      },
    },
    {
      label: '下一首',
      enabled: hasCurrentTrack,
      click: () => {
        options.sendCommand({ type: 'play-next' })
      },
    },
    { type: 'separator' },
    {
      label: '单曲循环',
      submenu: [
        createPlaybackModeItem(
          '列表循环',
          'repeat-all',
          state.playbackMode,
          options.sendCommand
        ),
        createPlaybackModeItem(
          '随机播放',
          'shuffle',
          state.playbackMode,
          options.sendCommand
        ),
        createPlaybackModeItem(
          '单曲循环',
          'repeat-one',
          state.playbackMode,
          options.sendCommand
        ),
      ],
    },
    { type: 'separator' },
    {
      label: '设置',
      click: () => {
        options.showMainWindow()
        options.sendCommand({ type: 'open-settings' })
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        options.quitApp()
      },
    },
  ]
}

/**
 * 创建托盘控制器。
 *
 * 托盘状态由 renderer 同步，菜单点击再以命令形式回传 renderer，主进程不持有播放器业务状态。
 */
export function createTrayController(options: TrayControllerOptions) {
  const Tray = options.Tray ?? (electron.Tray as TrayConstructor)
  const Menu = options.Menu ?? electron.Menu
  const nativeImage = options.nativeImage ?? electron.nativeImage
  const platform = options.platform ?? process.platform
  const appPath = options.appPath ?? electron.app.getAppPath()
  const resourcesPath = options.resourcesPath ?? process.resourcesPath
  const pathExists = options.pathExists ?? existsSync

  let tray: TrayLike | null = null
  let state = DEFAULT_TRAY_STATE

  const refreshMenu = () => {
    // Electron 托盘菜单没有响应式更新能力，状态变化时重建整份菜单最稳定。
    if (!tray) {
      return
    }

    tray.setContextMenu(
      Menu.buildFromTemplate(buildTrayMenuTemplate(state, options))
    )
  }

  return {
    initialize() {
      if (tray) {
        // 防止重复初始化创建多个系统托盘图标。
        return tray
      }

      tray = new Tray(
        getTrayIcon({
          nativeImage,
          platform,
          appPath,
          resourcesPath,
          pathExists,
        })
      )
      tray.setToolTip('AuralMusic')
      refreshMenu()
      tray.on('click', () => {
        options.showMainWindow()
      })
      tray.on('double-click', () => {
        options.showMainWindow()
      })

      return tray
    },
    setState(nextState: TrayState) {
      state = nextState
      refreshMenu()
    },
    destroy() {
      tray?.destroy()
      tray = null
    },
  }
}
