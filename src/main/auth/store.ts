import electron from 'electron'
import ElectronStore from 'electron-store'
import { AUTH_STORE_NAME } from './types.ts'
import { readMusicApiBaseUrlFromEnv } from '../music-api-runtime.ts'
import { createMainLogger } from '../logging/logger'
import { resolveAppStoreDirectory } from '../storage/store-path.ts'
import { parseCookiePairs, type AuthSession } from '../../shared/auth.ts'
import { resolveAuthRequestHeaders } from './request-header.ts'

interface AuthStoreSchema {
  session: AuthSession | null
}

const Store =
  (
    ElectronStore as typeof ElectronStore & {
      default?: typeof ElectronStore
    }
  ).default ?? ElectronStore
const { session } = electron
const authLogger = createMainLogger('auth')

const DEFAULT_AUTH_STATE: AuthStoreSchema = {
  session: null,
}

/** 构建鉴权存储配置，统一落到 userData 下，避免开发/生产目录漂移。 */
export function buildAuthStoreOptions(
  resolveStoreDirectory: () => string = resolveAppStoreDirectory
) {
  return {
    cwd: resolveStoreDirectory(),
    name: AUTH_STORE_NAME,
    defaults: DEFAULT_AUTH_STATE,
  }
}

function createAuthStore() {
  return new Store<AuthStoreSchema>(buildAuthStoreOptions())
}

/** 鉴权存储使用单例，避免多个 electron-store 实例并发写入同一个文件。 */
class AuthStore {
  private static instance: ReturnType<typeof createAuthStore>

  private constructor() {}

  static getInstance(): ReturnType<typeof createAuthStore> {
    if (!AuthStore.instance) {
      AuthStore.instance = createAuthStore()
    }

    return AuthStore.instance
  }
}

let authRequestHookRegistered = false

function getAuthStore() {
  return AuthStore.getInstance()
}

function resolveAuthOrigin() {
  const baseURL = readMusicApiBaseUrlFromEnv()

  if (!baseURL) {
    return undefined
  }

  try {
    return new URL(baseURL).origin
  } catch (error) {
    authLogger.error('Failed to resolve auth origin', { error })
    return undefined
  }
}

/** 将持久化会话里的 Cookie 写入 Electron 默认 session，供 BrowserWindow 请求自然携带。 */
async function applyAuthCookies(authSession: AuthSession) {
  const origin = resolveAuthOrigin()
  if (!origin || !authSession.cookie) {
    return
  }

  const cookiePairs = parseCookiePairs(authSession.cookie)
  if (!cookiePairs.length) {
    return
  }

  await Promise.all(
    cookiePairs.map(pair =>
      session.defaultSession.cookies.set({
        url: origin,
        name: pair.name,
        value: pair.value,
        path: '/',
      })
    )
  )
}

/** 清理 Electron session 中当前会话写入的 Cookie，退出登录时避免残留身份。 */
async function clearAuthCookies(authSession?: AuthSession | null) {
  const origin = resolveAuthOrigin()
  if (!origin || !authSession?.cookie) {
    return
  }

  const cookiePairs = parseCookiePairs(authSession.cookie)
  if (!cookiePairs.length) {
    return
  }

  await Promise.all(
    cookiePairs.map(pair =>
      session.defaultSession.cookies.remove(origin, pair.name)
    )
  )
}

/** 读取当前持久化登录会话。 */
export function getAuthSession() {
  return getAuthStore().get('session')
}

/** 保存登录会话并同步到 Electron Cookie jar。 */
export async function setAuthSession(authSession: AuthSession) {
  getAuthStore().set('session', authSession)
  await applyAuthCookies(authSession)
  return authSession
}

/** 清除登录会话和对应 Cookie。 */
export async function clearAuthSession() {
  const currentSession = getAuthStore().get('session')
  await clearAuthCookies(currentSession)
  getAuthStore().set('session', null)
}

/** 应用启动时恢复 Cookie，让刷新/重启后仍能访问需要登录的 Music API 接口。 */
export async function bootstrapAuthSession() {
  const currentSession = getAuthStore().get('session')
  if (!currentSession) {
    return null
  }

  await applyAuthCookies(currentSession)
  return currentSession
}

/**
 * 注册请求头注入 hook。
 *
 * hook 只能注册一次，否则每次启动流程重入都会重复修改同一请求头。
 */
export function registerAuthRequestHeaderHook() {
  if (authRequestHookRegistered) {
    return
  }

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({
      requestHeaders: resolveAuthRequestHeaders({
        authOrigin: resolveAuthOrigin(),
        authSession: getAuthSession(),
        requestHeaders: details.requestHeaders,
        requestUrl: details.url,
      }),
    })
  })

  authRequestHookRegistered = true
}
