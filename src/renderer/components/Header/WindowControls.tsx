import { Copy, Minus, Square, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'
import { useConfigStore } from '@/stores/config-store'

import CloseWindowDialog from '../CloseWindowDialog'
import { shouldShowCloseWindowDialog } from '../CloseWindowDialog/close-window.model'

interface WindowControlsProps {
  className?: string
}

const WindowControls = ({ className = '' }: WindowControlsProps) => {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const closeBehavior = useConfigStore(state => state.config.closeBehavior)

  useEffect(() => {
    let isMounted = true

    void window.electronWindow.isMaximized().then(value => {
      if (isMounted) {
        setIsMaximized(value)
      }
    })

    const unsubscribe = window.electronWindow.onMaximizeChange(value => {
      setIsMaximized(value)
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    const unsubscribe = window.electronWindow.onCloseRequested(() => {
      setIsOpen(true)
    })

    return unsubscribe
  }, [])

  const maximizeLabel = useMemo(
    () => (isMaximized ? '还原窗口' : '最大化窗口'),
    [isMaximized]
  )

  const handleClose = () => {
    if (shouldShowCloseWindowDialog(closeBehavior)) {
      setIsOpen(true)
      return
    }

    if (closeBehavior === 'minimize') {
      handleMiniWindow()
      return
    }

    handleCloseWindow()
  }

  const handleCloseWindow = () => {
    void window.electronWindow.quitApp()
  }

  const handleMiniWindow = () => {
    void window.electronWindow.hideToTray()
  }

  return (
    <div className={cn('window-no-drag flex items-stretch', className)}>
      <button
        type='button'
        aria-label='最小化窗口'
        className='hover:bg-foreground/8 flex h-13 w-13 items-center justify-center rounded-[15px] transition-colors'
        onClick={() => void window.electronWindow.minimize()}
      >
        <Minus className='size-4' />
      </button>
      <button
        type='button'
        aria-label={maximizeLabel}
        className='hover:bg-foreground/8 flex h-13 w-13 items-center justify-center rounded-[15px] transition-colors'
        onClick={() => void window.electronWindow.toggleMaximize()}
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
        onClick={handleClose}
      >
        <X className='size-4' />
      </button>

      <CloseWindowDialog
        open={isOpen}
        setOpen={setIsOpen}
        handleCloseWindow={handleCloseWindow}
        handleMiniWindow={handleMiniWindow}
      />
    </div>
  )
}

export default WindowControls
