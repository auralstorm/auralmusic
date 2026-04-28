import type { PlaybackMode, PlaybackStatus } from './playback.ts'

/** renderer 同步给主进程托盘菜单的播放状态快照。 */
export type TrayState = {
  currentTrackName: string
  currentArtistNames: string
  status: PlaybackStatus
  playbackMode: PlaybackMode
  hasCurrentTrack: boolean
}

/** 托盘菜单点击后回传给 renderer 的业务命令。 */
export type TrayCommand =
  | { type: 'toggle-play' }
  | { type: 'play-previous' }
  | { type: 'play-next' }
  | { type: 'set-playback-mode'; playbackMode: PlaybackMode }
  | { type: 'open-settings' }
