import { parseCookiePairs, type AuthSession } from '../../shared/auth.ts'

interface ResolveAuthRequestHeadersOptions {
  authOrigin?: string
  authSession?: AuthSession | null
  requestHeaders: Record<string, string | string[] | undefined>
  requestUrl: string
}

function isCookieHeaderName(headerName: string) {
  return headerName.toLowerCase() === 'cookie'
}

/** 仅给内置 Music API 同源请求补充登录 Cookie，避免把用户 Cookie 注入到第三方地址。 */
function isAuthRequest(requestUrl: string, authOrigin?: string) {
  if (!authOrigin) {
    return false
  }

  try {
    return new URL(requestUrl).origin === new URL(authOrigin).origin
  } catch {
    return false
  }
}

/** 保留原请求中的 Cookie header 大小写，避免部分服务端/代理对 header 名称表现不一致。 */
function resolveCookieHeaderName(
  requestHeaders: ResolveAuthRequestHeadersOptions['requestHeaders']
) {
  return (
    Object.keys(requestHeaders).find(headerName =>
      isCookieHeaderName(headerName)
    ) ?? 'Cookie'
  )
}

/** 将 Electron/Node 可能传入的多值 Cookie header 规整成浏览器格式。 */
function normalizeCookieHeader(
  cookieHeader?: string | string[] | undefined
): string {
  if (Array.isArray(cookieHeader)) {
    return cookieHeader.join('; ')
  }

  return cookieHeader ?? ''
}

/** 合并 Cookie 时按名称覆盖旧值，保证最新登录态优先于请求里已有的同名 Cookie。 */
function mergeCookieHeader(existingCookie = '', authCookie = '') {
  const mergedPairs = parseCookiePairs(existingCookie)
  const indexByName = new Map(
    mergedPairs.map((pair, index) => [pair.name, index] as const)
  )

  for (const pair of parseCookiePairs(authCookie)) {
    const existingIndex = indexByName.get(pair.name)

    if (existingIndex === undefined) {
      indexByName.set(pair.name, mergedPairs.length)
      mergedPairs.push(pair)
      continue
    }

    mergedPairs[existingIndex] = pair
  }

  return mergedPairs.map(pair => `${pair.name}=${pair.value}`).join('; ')
}

/**
 * 为发往 Music API 的请求补充鉴权 Cookie。
 *
 * 这个函数只返回新的 header 对象，不直接注册 webRequest hook，便于请求拦截和下载源解析复用。
 */
export function resolveAuthRequestHeaders({
  authOrigin,
  authSession,
  requestHeaders,
  requestUrl,
}: ResolveAuthRequestHeadersOptions) {
  if (!authSession?.cookie || !isAuthRequest(requestUrl, authOrigin)) {
    return requestHeaders
  }

  const cookieHeaderName = resolveCookieHeaderName(requestHeaders)
  const mergedCookieHeader = mergeCookieHeader(
    normalizeCookieHeader(requestHeaders[cookieHeaderName]),
    authSession.cookie
  )

  if (!mergedCookieHeader) {
    return requestHeaders
  }

  return {
    ...requestHeaders,
    [cookieHeaderName]: mergedCookieHeader,
  }
}

/** 将 Electron webRequest 的 header 结构转换为 fetch 可直接消费的字符串 header。 */
export function normalizeRequestHeadersForFetch(
  requestHeaders: Record<string, string | string[] | undefined>
) {
  const headers: Record<string, string> = {}

  for (const [headerName, headerValue] of Object.entries(requestHeaders)) {
    if (typeof headerValue === 'string') {
      headers[headerName] = headerValue
      continue
    }

    if (Array.isArray(headerValue) && headerValue.length > 0) {
      headers[headerName] = headerValue.join(
        isCookieHeaderName(headerName) ? '; ' : ', '
      )
    }
  }

  return headers
}
