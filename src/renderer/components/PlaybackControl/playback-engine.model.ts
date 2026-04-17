export interface PendingTrackAudio {
  currentTime: number
  pause: () => void
  removeAttribute: (name: string) => void
  load: () => void
}

export function prepareAudioForPendingTrack(audio: PendingTrackAudio) {
  audio.pause()
  audio.removeAttribute('src')
  audio.currentTime = 0
  audio.load()
}
