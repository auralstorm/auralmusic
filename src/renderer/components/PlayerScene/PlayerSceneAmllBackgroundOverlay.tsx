import type { CSSProperties } from 'react'

import { resolvePlayerBackgroundOverlayState } from './player-background-overlay.model'

type PlayerSceneAmllBackgroundOverlayProps = {
  enabled: boolean
  staticMode: boolean
  isDarkTheme: boolean
}

const PlayerSceneAmllBackgroundOverlay = ({
  enabled,
  staticMode,
  isDarkTheme,
}: PlayerSceneAmllBackgroundOverlayProps) => {
  if (!enabled) {
    return null
  }

  const overlay = resolvePlayerBackgroundOverlayState({
    enabled,
    staticMode,
    isDarkTheme,
  })

  const style = {
    '--player-amll-overlay-ambient': isDarkTheme
      ? `rgba(10, 14, 22, ${overlay.ambientOpacity})`
      : `rgba(245, 242, 236, ${overlay.ambientOpacity})`,
    '--player-amll-overlay-panel': isDarkTheme
      ? `rgba(8, 12, 20, ${overlay.lyricPanelOpacity})`
      : `rgba(245, 242, 236, ${overlay.lyricPanelOpacity})`,
    '--player-amll-overlay-vignette': isDarkTheme
      ? `rgba(0, 0, 0, ${overlay.vignetteOpacity})`
      : `rgba(15, 18, 24, ${overlay.vignetteOpacity})`,
    '--player-amll-overlay-glow': isDarkTheme
      ? `rgba(168, 196, 255, ${overlay.glowOpacity})`
      : `rgba(255, 255, 255, ${overlay.glowOpacity})`,
    '--player-amll-overlay-bottom': isDarkTheme
      ? `rgba(6, 10, 16, ${overlay.bottomOpacity})`
      : `rgba(245, 242, 236, ${overlay.bottomOpacity})`,
  } as CSSProperties

  return (
    <div aria-hidden='true' className='absolute inset-0' style={style}>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,var(--player-amll-overlay-glow),transparent_34%),radial-gradient(circle_at_78%_26%,rgba(255,255,255,0.08),transparent_24%),linear-gradient(102deg,var(--player-amll-overlay-ambient)_0%,transparent_34%,var(--player-amll-overlay-panel)_74%,var(--player-amll-overlay-panel)_100%)]' />
      <div className='absolute inset-y-0 right-0 w-[48vw] bg-[linear-gradient(90deg,transparent,var(--player-amll-overlay-panel)_22%,var(--player-amll-overlay-panel)_100%)]' />
      <div className='absolute inset-x-0 bottom-0 h-[30vh] bg-[linear-gradient(180deg,transparent,var(--player-amll-overlay-bottom))]' />
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_52%,var(--player-amll-overlay-vignette)_100%)]' />
    </div>
  )
}

export default PlayerSceneAmllBackgroundOverlay
