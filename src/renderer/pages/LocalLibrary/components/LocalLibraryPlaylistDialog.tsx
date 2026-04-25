import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface LocalLibraryPlaylistDialogProps {
  open: boolean
  title: string
  description: string
  value: string
  submitLabel: string
  pending?: boolean
  duplicateError?: string
  onValueChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  onSubmit: () => void
}

const LocalLibraryPlaylistDialog = ({
  open,
  title,
  description,
  value,
  submitLabel,
  pending = false,
  duplicateError = '',
  onValueChange,
  onOpenChange,
  onSubmit,
}: LocalLibraryPlaylistDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-[420px] rounded-[28px] border-white/70 bg-white/96 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/8 dark:bg-[#11131b]/96 dark:shadow-[0_28px_80px_rgba(0,0,0,0.36)]'>
        <DialogHeader className='space-y-2 pr-10'>
          <DialogTitle className='text-xl'>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className='space-y-2'>
          <Input
            value={value}
            maxLength={80}
            placeholder='歌单名称'
            className='h-11 rounded-2xl border-white/80 bg-white/84 shadow-[0_14px_36px_rgba(15,23,42,0.05)] dark:border-white/12 dark:bg-white/4'
            onChange={event => onValueChange(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !pending && value.trim()) {
                onSubmit()
              }
            }}
          />
          {duplicateError ? (
            <p className='text-sm text-[#d14d4d] dark:text-[#ff8e8e]'>
              {duplicateError}
            </p>
          ) : null}
        </div>

        <DialogFooter className='-mx-6 -mb-6 rounded-b-[28px] border-white/60 bg-[#f7f7fb]/86 px-6 py-4 dark:border-white/8 dark:bg-white/4'>
          <Button
            variant='outline'
            className='rounded-full'
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            className='rounded-full'
            disabled={pending || !value.trim()}
            onClick={onSubmit}
          >
            {pending ? '提交中...' : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LocalLibraryPlaylistDialog
