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

function resolveCookieHeaderName(
  requestHeaders: ResolveAuthRequestHeadersOptions['requestHeaders']
) {
  return (
    Object.keys(requestHeaders).find(headerName =>
      isCookieHeaderName(headerName)
    ) ?? 'Cookie'
  )
}

function normalizeCookieHeader(
  cookieHeader?: string | string[] | undefined
): string {
  if (Array.isArray(cookieHeader)) {
    return cookieHeader.join('; ')
  }

  return cookieHeader ?? ''
}

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
