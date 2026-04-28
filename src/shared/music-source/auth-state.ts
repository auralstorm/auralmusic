/** 音源解析策略只需要知道登录状态、用户 id 和 Cookie 是否存在。 */
export type MusicSourceAuthSnapshot = {
  loginStatus?: string | null
  userId?: number | null
  cookie?: string | null
}

/** 判断当前状态是否足以访问需要登录态的官方/音源解析接口。 */
export function isAuthenticatedForMusicResolution(
  snapshot: MusicSourceAuthSnapshot
) {
  if (snapshot.loginStatus === 'authenticated') {
    return true
  }

  if (typeof snapshot.cookie === 'string' && snapshot.cookie.trim()) {
    return true
  }

  return typeof snapshot.userId === 'number' && snapshot.userId > 0
}
