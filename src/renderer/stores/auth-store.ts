import { create } from 'zustand'
import {
  createLoginQr,
  getUserAccount,
  getVipInfoV2,
  logout as logoutRequest,
  loginWithEmail,
  loginWithPhone,
  checkLoginQr,
  getLoginQrKey,
  sendLoginCaptcha,
} from '@/api/auth'
import type { LoginMode } from '@/types/api'
import { normalizeAuthSession, normalizeVipState } from '../../shared/auth'
import type { AuthSession, AuthUser } from '../../shared/auth'
import type {
  AuthStoreState,
  LoginQrCheckResponse,
  LoginQrCreateResponse,
  LoginQrKeyResponse,
  QrState,
} from '@/types/core'
import { useUserStore } from './user'

const DEFAULT_LOGIN_MODE: LoginMode = 'qr'

const emptyUser = null

function unwrapNestedData<T>(response: T): T {
  let current: unknown = response

  while (
    current &&
    typeof current === 'object' &&
    'data' in current &&
    Boolean((current as { data?: unknown }).data)
  ) {
    current = (current as { data?: unknown }).data
  }

  return current as T
}

function toUser(session: AuthSession): AuthUser {
  return {
    userId: session.userId,
    nickname: session.nickname,
    avatarUrl: session.avatarUrl,
  }
}

async function persistSession(session: AuthSession) {
  await window.electronAuth.setAuthSession(session)
}

async function clearPersistedSession() {
  await window.electronAuth.clearAuthSession()
}

let qrState: QrState = {
  key: '',
  qrImg: '',
  qrUrl: '',
  polling: false,
}

let qrPollGeneration = 0

async function requestAuthSession(
  mode: LoginMode,
  response: unknown,
  fallbackCookie = ''
) {
  const updatedAt = Date.now()
  const session = normalizeAuthSession(
    response as Parameters<typeof normalizeAuthSession>[0],
    mode,
    updatedAt,
    fallbackCookie
  )

  if (!session.cookie || !session.userId) {
    throw new Error('auth session is incomplete')
  }

  // 会员态只影响音源分流，接口失败时按非 VIP 兜底，避免登录流程被次要能力阻断。
  const vipState = await getVipInfoV2(session.cookie, session.userId)
    .then(payload => normalizeVipState(payload, updatedAt))
    .catch(error => {
      console.error('fetch vip info failed', error)
      return normalizeVipState(null, updatedAt)
    })

  const nextSession = {
    ...session,
    ...vipState,
  }

  await persistSession(nextSession)
  return nextSession
}

export const useAuthStore = create<AuthStoreState>(set => ({
  // 当前登录用户的轻量展示信息，退出或会话失效时置空。
  user: emptyUser,
  // 持久化后的完整认证会话，包含 cookie、登录方式和会员态。
  session: null,
  // 登录、水合、二维码轮询等认证流程的统一加载态。
  isLoading: false,
  // 登录弹窗开关，由账号入口和鉴权失败场景控制。
  dialogOpen: false,
  // 当前登录方式，决定 LoginDialog 展示二维码、邮箱或手机表单。
  loginMode: DEFAULT_LOGIN_MODE,
  // 登录状态：匿名、已认证或本地会话过期。
  loginStatus: 'anonymous',
  // 最近一次认证流程错误文案，供登录弹窗展示。
  errorMessage: null,
  // 本地会话是否完成初始化，避免页面在认证态未确定前误判匿名。
  hasHydrated: false,

  // 从主进程持久化会话恢复登录态，并校验 cookie 是否仍可用。
  hydrateAuth: async () => {
    set({ isLoading: true, errorMessage: null })

    try {
      const persistedSession = await window.electronAuth.getAuthSession()
      if (!persistedSession?.cookie) {
        set({
          user: null,
          session: null,
          loginStatus: 'anonymous',
          hasHydrated: true,
        })
        return
      }

      try {
        const accountResponse = await getUserAccount(persistedSession.cookie)
        const session = await requestAuthSession(
          persistedSession.loginMethod,
          accountResponse,
          persistedSession.cookie
        )

        if (!session.userId) {
          throw new Error('invalid auth response')
        }

        set({
          user: toUser(session),
          session,
          loginStatus: 'authenticated',
          hasHydrated: true,
        })
        useUserStore.getState().resetUserData()
        void useUserStore.getState().fetchLikedSongs()
        void useUserStore.getState().fetchLikedArtists()
        void useUserStore.getState().fetchLikedAlbums()
      } catch (validationError) {
        console.error('auth hydration failed', validationError)
        await clearPersistedSession()
        set({
          user: null,
          session: null,
          loginStatus: 'expired',
          hasHydrated: true,
        })
      }
    } finally {
      set({ isLoading: false })
    }
  },

  // 打开登录弹窗，可指定默认登录方式。
  openLoginDialog: (mode = DEFAULT_LOGIN_MODE) => {
    set({ dialogOpen: true, loginMode: mode, errorMessage: null })
  },

  // 关闭登录弹窗并清理当前错误提示。
  closeLoginDialog: () => {
    set({ dialogOpen: false, errorMessage: null })
  },

  // 切换登录方式，同时清理旧方式留下的错误文案。
  setLoginMode: mode => {
    set({ loginMode: mode, errorMessage: null })
  },

  // 清理登录错误，供表单输入变化或手动重试前调用。
  clearError: () => {
    set({ errorMessage: null })
  },

  // 按当前表单模式执行登录，成功后持久化 session 并预拉用户收藏数据。
  loginWithCurrentMode: async payload => {
    set({ isLoading: true, errorMessage: null })

    try {
      let response: unknown
      let loginMode: LoginMode = payload.mode

      if (payload.mode === 'email') {
        response = await loginWithEmail({
          email: payload.email,
          password: payload.password,
        })
        loginMode = 'email'
      } else if (payload.mode === 'phone-password') {
        response = await loginWithPhone({
          phone: payload.phone,
          password: payload.password,
          countrycode: payload.countrycode,
        })
        loginMode = 'phone-password'
      } else {
        response = await loginWithPhone({
          phone: payload.phone,
          captcha: payload.captcha,
          countrycode: payload.countrycode,
        })
        loginMode = 'phone-captcha'
      }

      const session = await requestAuthSession(loginMode, response)

      set({
        user: toUser(session),
        session,
        dialogOpen: false,
        loginStatus: 'authenticated',
        errorMessage: null,
      })
      useUserStore.getState().resetUserData()
      void useUserStore.getState().fetchLikedSongs()
      void useUserStore.getState().fetchLikedArtists()
      void useUserStore.getState().fetchLikedAlbums()
    } catch (error) {
      console.error('login failed', error)
      set({
        errorMessage:
          error instanceof Error ? error.message : '登录失败，请稍后重试',
      })
    } finally {
      set({ isLoading: false })
    }
  },

  // 发送手机验证码，复用认证加载态避免重复提交。
  sendCaptchaCode: async (phone, ctcode = '86') => {
    set({ isLoading: true, errorMessage: null })

    try {
      await sendLoginCaptcha({ phone, ctcode })
    } catch (error) {
      console.error('send captcha failed', error)
      set({
        errorMessage:
          error instanceof Error ? error.message : '验证码发送失败，请稍后重试',
      })
    } finally {
      set({ isLoading: false })
    }
  },

  // 刷新二维码 key 和图片，并使旧轮询 generation 失效。
  refreshQrCode: async () => {
    set({ isLoading: true, errorMessage: null })

    try {
      qrPollGeneration += 1
      qrState = {
        ...qrState,
        polling: false,
      }

      const keyResponse = unwrapNestedData(
        (await getLoginQrKey()) as LoginQrKeyResponse
      )
      const key = keyResponse?.data?.unikey ?? keyResponse?.unikey ?? ''

      if (!key) {
        throw new Error('二维码 key 获取失败')
      }

      const qrResponse = unwrapNestedData(
        (await createLoginQr(key)) as LoginQrCreateResponse
      )
      const qrImg = qrResponse?.data?.qrimg ?? qrResponse?.qrimg ?? ''
      const qrUrl = qrResponse?.data?.qrurl ?? qrResponse?.qrurl ?? ''

      qrState = {
        ...qrState,
        key,
        qrImg,
        qrUrl,
        polling: false,
      }

      set({ errorMessage: null })
      return qrState
    } catch (error) {
      console.error('refresh qr failed', error)
      set({
        errorMessage:
          error instanceof Error ? error.message : '二维码刷新失败，请稍后重试',
      })
      return qrState
    } finally {
      set({ isLoading: false })
    }
  },

  // 轮询二维码登录状态，二维码刷新或重开后旧轮询会自动退出。
  pollQrLogin: async () => {
    if (!qrState.key || qrState.polling) {
      return
    }

    const currentGeneration = qrPollGeneration
    qrState = { ...qrState, polling: true }
    set({ isLoading: true, errorMessage: null })

    try {
      while (qrState.key && currentGeneration === qrPollGeneration) {
        const response = unwrapNestedData(
          (await checkLoginQr(qrState.key)) as LoginQrCheckResponse
        )
        const code = response?.code ?? response?.data?.code ?? 0

        if (code === 800) {
          throw new Error('二维码已失效，请刷新后重试')
        }

        if (code === 801) {
          await new Promise(resolve => window.setTimeout(resolve, 3000))
          continue
        }

        if (code === 802) {
          await new Promise(resolve => window.setTimeout(resolve, 3000))
          continue
        }

        if (code === 803) {
          const cookie = response?.cookie ?? response?.data?.cookie ?? ''
          const accountResponse = await getUserAccount(cookie)
          const session = await requestAuthSession(
            'qr',
            accountResponse,
            cookie
          )

          set({
            user: toUser(session),
            session,
            dialogOpen: false,
            loginStatus: 'authenticated',
            errorMessage: null,
          })
          useUserStore.getState().resetUserData()
          void useUserStore.getState().fetchLikedSongs()
          void useUserStore.getState().fetchLikedArtists()
          void useUserStore.getState().fetchLikedAlbums()
          return
        }

        throw new Error('二维码登录状态异常，请稍后重试')
      }
    } catch (error) {
      console.error('poll qr login failed', error)
      set({
        errorMessage:
          error instanceof Error ? error.message : '二维码登录失败，请稍后重试',
      })
    } finally {
      qrState = { ...qrState, polling: false }
      set({ isLoading: false })
    }
  },

  // 退出登录并清理本地会话、用户收藏缓存和登录弹窗状态。
  logout: async () => {
    set({ isLoading: true, errorMessage: null })

    try {
      await logoutRequest()
      await clearPersistedSession()
      useUserStore.getState().resetUserData()
      set({
        user: null,
        session: null,
        dialogOpen: false,
        loginStatus: 'anonymous',
        errorMessage: null,
      })
    } catch (error) {
      console.error('logout failed', error)
      set({
        errorMessage:
          error instanceof Error ? error.message : '退出登录失败，请稍后重试',
      })
    } finally {
      set({ isLoading: false })
    }
  },
}))

// 读取模块级二维码状态，避免二维码轮询高频写入 Zustand 造成无关组件刷新。
export const getQrLoginState = () => qrState

// 重置二维码状态并终止当前 generation 的轮询。
export const resetQrLoginState = () => {
  qrPollGeneration += 1
  qrState = {
    key: '',
    qrImg: '',
    qrUrl: '',
    polling: false,
  }
}

// 局部更新二维码状态，供登录弹窗同步二维码展示信息。
export const updateQrLoginState = (nextState: Partial<QrState>) => {
  qrState = {
    ...qrState,
    ...nextState,
  }
}
