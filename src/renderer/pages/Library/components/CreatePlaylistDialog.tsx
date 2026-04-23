import { useEffect, useMemo, useState } from 'react'

import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  buildCreatePlaylistPayload,
  CREATE_PLAYLIST_TITLE_MAX_LENGTH,
} from '@/model'
import { Separator } from '@/components/ui/separator'
import type { CreatePlaylistDialogProps } from '../types'

const CreatePlaylistDialog = ({
  open,
  submitting = false,
  onOpenChange,
  onSubmit,
}: CreatePlaylistDialogProps) => {
  const [title, setTitle] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)

  useEffect(() => {
    if (!open) {
      setTitle('')
      setIsPrivate(false)
    }
  }, [open])

  const payload = useMemo(
    () => buildCreatePlaylistPayload(title, isPrivate),
    [isPrivate, title]
  )

  const isCreateDisabled = useMemo(
    () => !payload || submitting,
    [payload, submitting]
  )

  const handleSubmit = async () => {
    if (!payload || submitting) {
      return
    }

    try {
      await onSubmit(payload)
    } catch {
      // Parent handler owns the error toast; keep dialog state intact here.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className='bg-background/90 text-primary w-[min(420px,calc(100vw-1.5rem))] max-w-[420px] rounded-[26px] border p-0 shadow-[0_30px_80px_rgba(15,23,42,0.16)] backdrop-blur-sm'
      >
        <div className='px-7 pt-6 pb-7'>
          <DialogHeader className='flex-row items-center justify-between gap-4 border-b pb-5'>
            <DialogTitle className='text-[15px] font-bold'>
              新建歌单
            </DialogTitle>

            <DialogClose asChild>
              <button
                type='button'
                className='text-foreground/70 hover:text-primary hover:bg-background/5 inline-flex size-8 items-center justify-center rounded-full transition-colors'
                aria-label='关闭新建歌单弹窗'
              >
                <X className='size-4' />
              </button>
            </DialogClose>
          </DialogHeader>

          <div className='space-y-5 pt-6'>
            <Input
              autoFocus
              value={title}
              onChange={event => setTitle(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void handleSubmit()
                }
              }}
              placeholder='歌单标题'
              maxLength={CREATE_PLAYLIST_TITLE_MAX_LENGTH}
              className='text-primary focus-visible:border-primary/20 focus-visible:ring-primary/10 h-12 rounded-[14px] border-neutral-100 bg-neutral-100 px-4 text-[15px] placeholder:text-neutral-400'
            />

            <label className='text-primary flex cursor-pointer items-center gap-2.5 text-sm font-medium'>
              <input
                type='checkbox'
                checked={isPrivate}
                onChange={event => setIsPrivate(event.target.checked)}
                className='accent-primary border-primary size-4 rounded-[4px] border'
              />
              设为隐私歌单
            </label>

            <Separator className='border-primary' />

            <Button
              type='button'
              disabled={isCreateDisabled}
              onClick={() => void handleSubmit()}
              className='h-12 w-full cursor-pointer rounded-[14px] text-base font-semibold'
            >
              {submitting ? '创建中...' : '创建'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CreatePlaylistDialog
