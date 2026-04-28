export type AuthLoginMethod =
  | 'email'
  | 'phone-password'
  | 'phone-captcha'
  | 'qr'

/** 已登录用户基础资料。 */
export interface AuthUser {
  userId: number
  nickname: string
  avatarUrl: string
}

/** VIP 状态快照，和登录会话分开归一化，便于独立刷新。 */
export interface AuthVipState {
  isVip: boolean
  vipUpdatedAt: number
}

/** 主进程持久化的完整登录会话。 */
export interface AuthSession extends AuthUser {
  cookie: string
  loginMethod: AuthLoginMethod
  updatedAt: number
  isVip?: boolean
  vipUpdatedAt?: number
}

/** Cookie 字符串解析后的键值对。 */
export interface CookiePair {
  name: string
  value: string
}

interface RawAuthProfile {
  nickname?: string
  avatarUrl?: string
  avatarImgUrl?: string
}

interface RawAuthAccount {
  id?: number
}

export interface RawAuthResponseBody {
  code?: number
  cookie?: string
  account?: RawAuthAccount
  profile?: RawAuthProfile
  data?: RawAuthResponseBody
}

export interface RawVipInfoResponseBody {
  code?: number
  redVipLevel?: number
  musicPackage?: {
    vipLevel?: number
  }
  associator?: {
    vipLevel?: number
  }
  data?: RawVipInfoResponseBody
}

const COOKIE_ATTRIBUTE_NAMES = new Set([
  'domain',
  'expires',
  'httponly',
  'max-age',
  'path',
  'priority',
  'secure',
  'samesite',
])

/** 兼容接口返回 data.data 嵌套的结构，递归取出真正业务体。 */
function unwrapResponseBody<T extends { data?: T }>(response?: T | null): T {
  if (!response) {
    return {} as T
  }

  if (response.data && typeof response.data === 'object') {
    return unwrapResponseBody(response.data)
  }

  return response
}

/** 识别 Set-Cookie 属性，避免把 path/domain/httponly 当成业务 Cookie。 */
function isCookieAttribute(token: string) {
  const [name] = token.split('=')
  if (!name) {
    return true
  }

  return COOKIE_ATTRIBUTE_NAMES.has(name.trim().toLowerCase())
}

/** 将单个 cookie token 转成键值对，非法 token 返回 null。 */
function toCookiePair(token: string): CookiePair | null {
  const index = token.indexOf('=')
  if (index <= 0) {
    return null
  }

  const name = token.slice(0, index).trim()
  const value = token.slice(index + 1).trim()

  if (!name || !value || isCookieAttribute(token)) {
    return null
  }

  return { name, value }
}

/** 解析 Cookie 字符串，只保留真正的 name=value 项。 */
export function parseCookiePairs(cookieString = ''): CookiePair[] {
  return cookieString
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .flatMap(part => {
      const pair = toCookiePair(part)
      return pair ? [pair] : []
    })
}

/** 优先使用接口返回 cookie，缺失时使用调用方传入的兜底 Cookie。 */
function resolveCookieString(
  response: RawAuthResponseBody,
  fallbackCookie = ''
) {
  return (response.cookie || fallbackCookie || '').trim()
}

/** 兼容 profile.avatarUrl 和 avatarImgUrl 两种头像字段。 */
function resolveAvatarUrl(profile?: RawAuthProfile) {
  return profile?.avatarUrl?.trim() || profile?.avatarImgUrl?.trim() || ''
}

/** 将登录接口响应归一化成应用内部会话模型。 */
export function normalizeAuthSession(
  response?: RawAuthResponseBody | null,
  loginMethod: AuthLoginMethod = 'email',
  updatedAt = Date.now(),
  fallbackCookie = '',
  vipState: Partial<AuthVipState> = {}
): AuthSession {
  const body = unwrapResponseBody(response)
  const accountId = body.account?.id ?? 0
  const profile = body.profile

  return {
    cookie: resolveCookieString(body, fallbackCookie),
    isVip: vipState.isVip === true,
    loginMethod,
    updatedAt,
    userId: accountId,
    nickname: profile?.nickname?.trim() || '',
    avatarUrl: resolveAvatarUrl(profile),
    vipUpdatedAt: vipState.vipUpdatedAt ?? updatedAt,
  }
}

/** 将 VIP 接口响应归一化成布尔 VIP 状态。 */
export function normalizeVipState(
  response?: RawVipInfoResponseBody | null,
  updatedAt = Date.now()
): AuthVipState {
  const body = unwrapResponseBody(response)
  const redVipLevel =
    typeof body.redVipLevel === 'number' ? body.redVipLevel : 0
  const musicPackageLevel =
    typeof body.musicPackage?.vipLevel === 'number'
      ? body.musicPackage.vipLevel
      : 0
  const associatorLevel =
    typeof body.associator?.vipLevel === 'number' ? body.associator.vipLevel : 0

  return {
    isVip: redVipLevel > 0 || musicPackageLevel > 0 || associatorLevel > 0,
    vipUpdatedAt: updatedAt,
  }
}
