import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { UpdateModalProps } from '@/types/update'

export function UpdateModal({
  open,
  status,
  info,
  progress = 0,
  onOpenChange,
  onStartUpdate,
  onRestart,
  onGoToDownload,
}: UpdateModalProps) {
  const isLinux = status === 'update-available' && !!onGoToDownload
  const isDownloading = status === 'downloading'
  const canShowVersionInfo = status !== 'checking' && status !== 'error'

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (isDownloading && !nextOpen) {
          return
        }

        onOpenChange(nextOpen)
      }}
    >
      <DialogContent
        className='gap-5 sm:max-w-lg'
        showCloseButton={!isDownloading}
        onInteractOutside={event => {
          if (isDownloading) {
            event.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className='text-xl font-semibold'>
            {status === 'checking' && '检查更新中…'}
            {status === 'update-available' && '发现新版本'}
            {status === 'downloading' && '正在下载更新'}
            {status === 'update-downloaded' && '更新已完成'}
            {status === 'up-to-date' && '已是最新版本'}
            {status === 'error' && '更新失败'}
          </DialogTitle>
        </DialogHeader>

        {canShowVersionInfo && (
          <div className='text-muted-foreground text-sm'>
            当前版本：v{info.currentVersion}
            <span className='mx-2'>→</span>
            最新版本：v{info.latestVersion}
            {info.releaseDate && (
              <span className='ml-2 text-xs'>{info.releaseDate}</span>
            )}
          </div>
        )}

        {(status === 'update-available' || status === 'update-downloaded') && (
          <Card>
            <CardContent className='p-3'>
              <ScrollArea className='h-[120px] w-full text-sm whitespace-pre-wrap'>
                {info.releaseNotes || '暂无更新说明'}
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {status === 'downloading' && (
          <div className='space-y-2'>
            <Progress value={progress} className='h-2' />
            <p className='text-muted-foreground text-center text-xs'>
              {Math.round(progress)}%
            </p>
          </div>
        )}

        {status === 'up-to-date' && (
          <p className='text-muted-foreground text-sm'>
            当前已是最新版本，无需更新
          </p>
        )}

        {status === 'error' && (
          <p className='text-destructive text-sm'>
            检查或下载更新失败，请稍后重试
          </p>
        )}

        <DialogFooter
          className={cn(isLinux ? 'justify-end' : 'gap-2 sm:justify-between')}
        >
          <DialogClose asChild>
            <Button variant='secondary' disabled={isDownloading}>
              稍后提醒
            </Button>
          </DialogClose>

          {status === 'update-available' && !isLinux && (
            <Button onClick={onStartUpdate}>立即更新</Button>
          )}

          {status === 'update-downloaded' && (
            <Button onClick={onRestart}>立即重启</Button>
          )}

          {isLinux && <Button onClick={onGoToDownload}>前往下载</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
