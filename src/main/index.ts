import electron from 'electron'
import { bootstrapMainApp } from './app/bootstrap'
import { createMainLogger, initializeMainLogger } from './logging/logger'
import { registerLocalMediaScheme } from './protocol/local-media'

// 日志必须最早初始化，后续 bootstrap、Music API 和 IPC 注册过程才能写入同一份主进程日志。
initializeMainLogger()
createMainLogger('bootstrap').info('main process bootstrap requested')

if (process.env.NODE_ENV_ELECTRON_VITE === 'development') {
  // 固定远程调试端口，便于开发时通过 Chrome/DevTools 连接主窗口。
  electron.app.commandLine.appendSwitch('remote-debugging-port', '9222')
}

// 自定义协议需要在 app ready 前声明 scheme 权限，实际 handler 在 bootstrap ready 后注册。
registerLocalMediaScheme()
bootstrapMainApp()
