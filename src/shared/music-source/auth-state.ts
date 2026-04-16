export type MusicSourceAuthSnapshot = {
  loginStatus?: string | null
  userId?: number | null
  cookie?: string | null
}

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
