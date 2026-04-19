import { Copy, Minus, Square, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { getElectronWindowApi } from '@/lib/electron-runtime'
import { cn } from '@/lib/utils'

import type { WindowControlsProps } from './types'

const WindowControls = ({ className = '' }: WindowControlsProps) => {
  const [isMaximized, setIsMaximized] = useState(false)
  const electronWindow = getElectronWindowApi()

  useEffect(() => {
    if (!electronWindow) {
      return
    }

    let isMounted = true

    void electronWindow.isMaximized().then(value => {
      if (isMounted) {
        setIsMaximized(value)
      }
    })

    const unsubscribe = electronWindow.onMaximizeChange(value => {
      setIsMaximized(value)
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [electronWindow])

  const maximizeLabel = useMemo(
    () => (isMaximized ? '还原窗口' : '最大化窗口'),
    [isMaximized]
  )

  if (!electronWindow) {
    return null
  }

  return (
    <div className={cn('window-no-drag flex items-stretch', className)}>
      <button
        type='button'
        aria-label='最小化窗口'
        className='hover:bg-foreground/8 flex h-13 w-13 items-center justify-center rounded-[15px] transition-colors'
        onClick={() => void electronWindow.minimize()}
      >
        <Minus className='size-4' />
      </button>
      <button
        type='button'
        aria-label={maximizeLabel}
        className='hover:bg-foreground/8 flex h-13 w-13 items-center justify-center rounded-[15px] transition-colors'
        onClick={() => void electronWindow.toggleMaximize()}
      >
        {isMaximized ? (
          <Copy className='size-3.5 rotate-180' />
        ) : (
          <Square className='size-3.5' />
        )}
      </button>
      <button
        type='button'
        aria-label='关闭窗口'
        className='hover:bg-foreground/8 flex h-13 w-13 items-center justify-center rounded-[15px] transition-colors'
        onClick={() => void electronWindow.close()}
      >
        <X className='size-4' />
      </button>
    </div>
  )
}

export default WindowControls
