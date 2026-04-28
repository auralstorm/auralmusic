import { spawn, type ChildProcess } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'

import {
  createMusicApiBaseUrl,
  MUSIC_API_HOST,
  type MusicApiRuntimeInfo,
} from './music-api-runtime.ts'

const DEFAULT_MUSIC_API_PORT = 7703
const DEFAULT_PORT_RETRY_COUNT = 10

type PortAvailabilityChecker = (port: number, host: string) => Promise<boolean>
type Logger = Pick<typeof console, 'log' | 'error'>
type MusicApiProcess = Pick<
  ChildProcess,
  'kill' | 'once' | 'stdout' | 'stderr' | 'pid'
>
type SpawnMusicApiProcess = (options: {
  port: number
  host: string
  env: NodeJS.ProcessEnv
}) => MusicApiProcess
type WaitForMusicApiListening = (options: {
  port: number
  host: string
  timeoutMs?: number
}) => Promise<void>

type FindAvailableMusicApiPortOptions = {
  startPort?: number
  maxRetries?: number
  host?: string
  checkPortAvailable?: PortAvailabilityChecker
  log?: Logger
}

type StartMusicApiOptions = FindAvailableMusicApiPortOptions & {
  spawnMusicApiProcess?: SpawnMusicApiProcess
  waitForMusicApiListening?: WaitForMusicApiListening
  startupTimeoutMs?: number
  env?: NodeJS.ProcessEnv
}

export interface StartedMusicApiRuntime extends MusicApiRuntimeInfo {
  dispose: () => void
}

/**
 * 检查指定端口是否可监听。
 *
 * 这里只创建临时 server 进行探测，不复用业务进程，避免端口选择阶段启动 Music API 后难以回滚。
 */
export function checkPortAvailable(
  port: number,
  host: string = MUSIC_API_HOST
): Promise<boolean> {
  return new Promise(resolve => {
    const tester = net
      .createServer()
      .once('error', () => {
        resolve(false)
      })
      .once('listening', () => {
        tester.close(() => resolve(true))
      })
      .listen(port, host)
  })
}

/** 解析内置 NeteaseCloudMusicApiEnhanced 入口脚本路径。 */
function resolveMusicApiEntryScript() {
  const packageJsonPath =
    require.resolve('@neteasecloudmusicapienhanced/api/package.json')
  return path.join(path.dirname(packageJsonPath), 'app.js')
}

/** 将子进程 stdout/stderr 透传到主进程，方便开发和日志系统收集启动异常。 */
function bindMusicApiProcessLogs(child: MusicApiProcess) {
  child.stdout?.on('data', chunk => {
    process.stdout.write(String(chunk))
  })
  child.stderr?.on('data', chunk => {
    process.stderr.write(String(chunk))
  })
}

/** 构造启动阶段提前退出的错误，带上退出码和 signal 便于诊断。 */
function createMusicApiExitError(code: number | null, signal: string | null) {
  const codeLabel = code === null ? 'null' : String(code)
  const signalLabel = signal ?? 'null'
  return new Error(
    `Music API process exited before listening (code: ${codeLabel}, signal: ${signalLabel})`
  )
}

/** 以 ELECTRON_RUN_AS_NODE 启动 Music API，避免创建额外 Electron 实例。 */
function spawnMusicApiProcess({
  port,
  host,
  env,
}: {
  port: number
  host: string
  env: NodeJS.ProcessEnv
}): MusicApiProcess {
  const child = spawn(process.execPath, [resolveMusicApiEntryScript()], {
    env: {
      ...env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(port),
      HOST: host,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

  bindMusicApiProcessLogs(child)
  return child
}

/** 轮询 TCP 连接，直到 Music API 真正开始监听或超时。 */
function waitForMusicApiListening({
  port,
  host,
  timeoutMs = 10_000,
}: {
  port: number
  host: string
  timeoutMs?: number
}) {
  const deadline = Date.now() + timeoutMs

  return new Promise<void>((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.createConnection({ port, host })

      socket.once('connect', () => {
        socket.end()
        resolve()
      })

      socket.once('error', error => {
        socket.destroy()

        if (Date.now() >= deadline) {
          reject(error)
          return
        }

        setTimeout(tryConnect, 100)
      })
    }

    tryConnect()
  })
}

/**
 * 查找可用 Music API 端口。
 *
 * 默认从 7703 开始递增探测，避免用户本机已有服务占用默认端口时整个应用启动失败。
 */
export async function findAvailableMusicApiPort(
  options: FindAvailableMusicApiPortOptions = {}
) {
  const {
    startPort = DEFAULT_MUSIC_API_PORT,
    maxRetries = DEFAULT_PORT_RETRY_COUNT,
    host = MUSIC_API_HOST,
    checkPortAvailable: isPortAvailable = checkPortAvailable,
    log = console,
  } = options

  let port = startPort

  for (let i = 0; i < maxRetries; i++) {
    const isAvailable = await isPortAvailable(port, host)
    if (isAvailable) {
      return port
    }

    log.log(`port ${port} is busy, switching to ${port + 1}`)
    port++
  }

  return port
}

/**
 * 启动内置 Music API 子进程。
 *
 * 返回的 runtimeInfo 会写入环境变量并在应用退出时 dispose；启动成功以端口可连接为准，
 * 不是单纯以 spawn 成功为准。
 */
async function startMusicApi(
  options: StartMusicApiOptions = {}
): Promise<StartedMusicApiRuntime> {
  const {
    host = MUSIC_API_HOST,
    log = console,
    env = process.env,
    spawnMusicApiProcess: runMusicApiProcess = spawnMusicApiProcess,
    waitForMusicApiListening: waitUntilListening = waitForMusicApiListening,
    startupTimeoutMs = 10_000,
  } = options

  log.log('MUSIC API STARTING...')
  const port = await findAvailableMusicApiPort({
    ...options,
    host,
    log,
  })

  try {
    const child = runMusicApiProcess({
      port,
      host,
      env,
    })

    await Promise.race([
      waitUntilListening({
        port,
        host,
        timeoutMs: startupTimeoutMs,
      }),
      new Promise<never>((_, reject) => {
        child.once('exit', (code, signal) => {
          reject(createMusicApiExitError(code, signal))
        })
      }),
    ])

    const runtimeInfo = {
      port,
      baseURL: createMusicApiBaseUrl(port, host),
      dispose: () => {
        child.kill()
      },
    }

    log.log(`MUSIC API STARTED on port ${port}`)
    return runtimeInfo
  } catch (error) {
    log.error('MUSIC API start failed:', error)
    throw error
  }
}

export { startMusicApi }
