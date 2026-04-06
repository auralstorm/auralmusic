import { app, BrowserWindow, globalShortcut } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { startMusicApi } from './server'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null

function getRendererUrl() {
  // 根据环境返回不同的 URL
  if (app.isPackaged) {
    // 打包后：指向 out/renderer 下的 index.html
    return path.join(__dirname, '../renderer/index.html')
  }
  // 开发环境：使用 Vite 开发服务器地址
  return process.env.ELECTRON_RENDERER_URL!
}

// 获取预加载脚本的路径
function getPreloadPath() {
  return path.join(__dirname, '../preload/index.js')
}
// 创建浏览器窗口并加载应用
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, // 设置窗口宽度
    height: 760, // 设置窗口高度
    minWidth: 1280, // 设置窗口最小宽度
    minHeight: 760, // 设置窗口最小高度
    // backgroundColor: "#09090b", // 设置窗口背景色
    // frame: true, // 去掉整个系统标题栏+菜单栏
    // transparent: true, // 可根据需要开启透明
    titleBarStyle: 'hiddenInset',
    titleBarOverlay: {
      color: '#09090b', // 标题栏背景色
      symbolColor: '#f5f7fb', // 按钮颜色
      height: 52, // 标题栏高度
    },
    autoHideMenuBar: true, // 自动隐藏菜单栏，按 Alt 键显示
    webPreferences: {
      // 预加载脚本路径
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // ✅ 只移除菜单栏，保留窗口控制按钮
  mainWindow.setMenu(null)

  const rendererUrl = getRendererUrl()
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(rendererUrl)
  } else {
    mainWindow.loadFile(rendererUrl)
  }

  // 在开发模式下自动打开开发者工具
  if (process.env.NODE_ENV_ELECTRON_VITE === 'development') {
    // mainWindow.webContents.openDevTools();
    // 注册快捷键备用
    globalShortcut.register('Control+Shift+I', () => {
      mainWindow.webContents.toggleDevTools()
    })
  }
}

// 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(createWindow)
// 在所有窗口关闭时退出应用（除非在 macOS 上）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
// 在 macOS 上，当点击 Dock 图标并且没有其他窗口打开时，重新创建一个窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

startMusicApi().catch(error => {
  console.error('启动 Music API 失败:', error)
})
