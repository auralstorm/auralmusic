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
import { Separator } from '@/components/ui/separator'

interface CreatePlaylistDialogProps {
  open: boolean
  submitting?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: { name: string; privacy?: '10' }) => Promise<void> | void
}

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

  const isCreateDisabled = useMemo(
    () => !title.trim() || submitting,
    [submitting, title]
  )

  const handleSubmit = async () => {
    const nextTitle = title.trim()

    if (!nextTitle || submitting) {
      return
    }

    try {
      await onSubmit({
        name: nextTitle,
        privacy: isPrivate ? '10' : undefined,
      })
    } catch {
      // Parent handler owns the error toast; keep dialog state intact here.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className='w-[min(420px,calc(100vw-1.5rem))] max-w-[420px] rounded-[26px] border border-white/70 bg-white/95 p-0 text-neutral-950 shadow-[0_30px_80px_rgba(15,23,42,0.16)] backdrop-blur-sm'
      >
        <div className='px-7 pt-6 pb-7'>
          <DialogHeader className='flex-row items-center justify-between gap-4 border-b border-neutral-100 pb-5'>
            <DialogTitle className='text-[15px] font-bold'>
              新建歌单
            </DialogTitle>

            <DialogClose asChild>
              <button
                type='button'
                className='text-primary/50 hover:text-primary inline-flex size-8 items-center justify-center rounded-full transition-colors hover:bg-neutral-100'
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
              maxLength={40}
              className='text-primary focus-visible:border-primary/20 focus-visible:ring-primary/10 h-12 rounded-[14px] border-neutral-100 bg-neutral-100 px-4 text-[15px] placeholder:text-neutral-400'
            />

            <label className='text-primary/60 flex cursor-pointer items-center gap-2.5 text-sm font-medium'>
              <input
                type='checkbox'
                checked={isPrivate}
                onChange={event => setIsPrivate(event.target.checked)}
                className='accent-primary size-4 rounded-[4px] border border-neutral-300'
              />
              设为隐私歌单
            </label>

            <Separator className='bg-neutral-100' />

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
