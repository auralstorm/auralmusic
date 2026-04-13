import { useEffect, useState } from 'react'

import { useConfigStore } from '@/stores/config-store'

import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Field, FieldGroup, FieldLabel } from '../ui/field'
import {
  resolveCloseWindowDialogConfig,
  type CloseWindowAction,
} from './close-window.model'

interface CloseWindowDialogProps {
  open: boolean
  setOpen: (value: boolean) => void
  handleCloseWindow: () => void
  handleMiniWindow: () => void
}

const CloseWindowDialog = ({
  open,
  setOpen,
  handleCloseWindow,
  handleMiniWindow,
}: CloseWindowDialogProps) => {
  const rememberCloseChoice = useConfigStore(
    state => state.config.rememberCloseChoice
  )
  const setConfig = useConfigStore(state => state.setConfig)
  const [isRemembered, setIsRemembered] = useState(rememberCloseChoice)

  useEffect(() => {
    if (open) {
      setIsRemembered(rememberCloseChoice)
    }
  }, [open, rememberCloseChoice])

  const handleCloseAction = (action: CloseWindowAction) => {
    const nextConfig = resolveCloseWindowDialogConfig(action, isRemembered)
    if (isRemembered) {
      void setConfig('rememberCloseChoice', nextConfig.rememberCloseChoice)
      void setConfig('closeBehavior', nextConfig.closeBehavior)
    }
    setOpen(false)

    if (action === 'minimize') {
      handleMiniWindow()
      return
    }

    handleCloseWindow()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>关闭应用</DialogTitle>
          <DialogDescription>请选择关闭方式</DialogDescription>
        </DialogHeader>
        <FieldGroup className='w-full'>
          <Field orientation='horizontal'>
            <Checkbox
              id='rememberCloseChoice'
              name='rememberCloseChoice'
              checked={isRemembered}
              onCheckedChange={checked => {
                setIsRemembered(checked === true)
              }}
            />
            <FieldLabel htmlFor='rememberCloseChoice'>记住我的选择</FieldLabel>
          </Field>
        </FieldGroup>
        <DialogFooter className='justify-around sm:justify-around'>
          <Button type='button' variant='ghost' onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            type='button'
            variant='ghost'
            onClick={() => handleCloseAction('quit')}
          >
            退出应用
          </Button>
          <Button type='button' onClick={() => handleCloseAction('minimize')}>
            最小化到托盘
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CloseWindowDialog
