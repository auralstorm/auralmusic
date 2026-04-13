export const PLAYLIST_NAME_MAX_LENGTH = 40

export type PlaylistDetailMoreAction = 'edit' | 'delete'

export interface PlaylistUpdateDraft {
  id: number
  name: string
  description: string
}

export interface PlaylistUpdatePayload {
  id: number
  name: string
  desc: string
}

export function resolvePlaylistDetailMoreActions(
  isOwnPlaylist: boolean
): PlaylistDetailMoreAction[] {
  return isOwnPlaylist ? ['edit', 'delete'] : []
}

export function buildPlaylistUpdatePayload(
  draft: PlaylistUpdateDraft
): PlaylistUpdatePayload | null {
  const name = draft.name.trim()

  if (!name || name.length > PLAYLIST_NAME_MAX_LENGTH) {
    return null
  }

  return {
    id: draft.id,
    name,
    desc: draft.description.trim(),
  }
}
