import { cn } from '@/lib/utils'
import type { PlayerSceneChromeButtonProps } from './types'
import { memo } from 'react'

const POSITION_CLASS = {
  left: 'left-8',
  right: 'right-8',
} as const

const PlayerSceneChromeButton = ({
  children,
  className,
  position,
  visible,
  onReveal,
  tabIndex,
  ...buttonProps
}: PlayerSceneChromeButtonProps) => {
  return (
    <div
      className={cn('absolute top-6 z-30 p-2', POSITION_CLASS[position])}
      onMouseEnter={onReveal}
      onPointerMove={onReveal}
    >
      <button
        {...buttonProps}
        aria-hidden={!visible}
        tabIndex={visible ? tabIndex : -1}
        className={cn(
          'flex size-11 items-center justify-center rounded-full bg-white/12 text-[var(--player-muted)] backdrop-blur-xl transition-[opacity,background-color,color] duration-300 hover:bg-white/20 hover:text-[var(--player-foreground)]',
          visible
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0',
          className
        )}
      >
        {children}
      </button>
    </div>
  )
}

export default memo(PlayerSceneChromeButton)
