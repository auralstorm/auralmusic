import electron from 'electron'
import ElectronStore from 'electron-store'
import { AUTH_STORE_NAME } from './types'
import { readMusicApiBaseUrlFromEnv } from '../music-api-runtime'
import { parseCookiePairs, type AuthSession } from '../../shared/auth'
import { resolveAuthRequestHeaders } from './request-header'

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

const DEFAULT_AUTH_STATE: AuthStoreSchema = {
  session: null,
}

function createAuthStore() {
  return new Store<AuthStoreSchema>({
    cwd: process.cwd(),
    name: AUTH_STORE_NAME,
    defaults: DEFAULT_AUTH_STATE,
  })
}

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

const authStore = AuthStore.getInstance()
let authRequestHookRegistered = false

function resolveAuthOrigin() {
  const baseURL = readMusicApiBaseUrlFromEnv()

  if (!baseURL) {
    return undefined
  }

  try {
    return new URL(baseURL).origin
  } catch (error) {
    console.error('Failed to resolve auth origin:', error)
    return undefined
  }
}

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

export function getAuthSession() {
  return authStore.get('session')
}

export async function setAuthSession(authSession: AuthSession) {
  authStore.set('session', authSession)
  await applyAuthCookies(authSession)
  return authSession
}

export async function clearAuthSession() {
  const currentSession = authStore.get('session')
  await clearAuthCookies(currentSession)
  authStore.set('session', null)
}

export async function bootstrapAuthSession() {
  const currentSession = authStore.get('session')
  if (!currentSession) {
    return null
  }

  await applyAuthCookies(currentSession)
  return currentSession
}

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
