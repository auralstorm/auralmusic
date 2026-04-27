import { FolderOpen, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  canOpenDownloadTaskFile,
  canOpenDownloadTaskFolder,
  formatDownloadTaskProgress,
  formatDownloadTaskFileSize,
  getDownloadTaskQualityLabel,
  getDownloadTaskStatusLabel,
} from '../downloads.model'
import type { DownloadTaskRowProps } from '../types'

const DownloadTaskRow = ({
  task,
  onOpenFile,
  onOpenFolder,
  onRemoveTask,
}: DownloadTaskRowProps) => {
  const canOpenFile = canOpenDownloadTaskFile(task)
  const canOpenFolder = canOpenDownloadTaskFolder(task)

  return (
    <article className='bg-primary/5 grid gap-4 rounded-[15px] px-5 py-4 lg:grid-cols-[minmax(0,2fr)_110px_110px_110px_110px_auto] lg:items-center'>
      <div className='min-w-0'>
        <p className='text-foreground truncate text-sm font-semibold'>
          {task.songName}
        </p>
        <p className='text-muted-foreground mt-1 text-xs'>
          任务 ID: {task.taskId}
        </p>
      </div>

      <div>
        <p className='text-muted-foreground text-xs'>进度</p>
        <p className='text-foreground mt-1 text-sm font-medium'>
          {formatDownloadTaskProgress(task)}
        </p>
      </div>

      <div>
        <p className='text-muted-foreground text-xs'>状态</p>
        <p className='text-foreground mt-1 text-sm font-medium'>
          {getDownloadTaskStatusLabel(task.status)}
        </p>
      </div>

      <div>
        <p className='text-muted-foreground text-xs'>最终音质</p>
        <p className='text-foreground mt-1 text-sm font-medium'>
          {getDownloadTaskQualityLabel(task.quality)}
        </p>
      </div>

      <div>
        <p className='text-muted-foreground text-xs'>歌曲大小</p>
        <p className='text-foreground mt-1 text-sm font-medium'>
          {formatDownloadTaskFileSize(task.fileSizeBytes)}
        </p>
      </div>

      <div className='flex flex-wrap items-center gap-2 lg:justify-end'>
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={!canOpenFile}
          onClick={() => onOpenFile(task.taskId)}
        >
          <Play />
          点击播放
        </Button>
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={!canOpenFolder}
          onClick={() => onOpenFolder(task.taskId)}
        >
          <FolderOpen />
          打开目录
        </Button>
        <Button
          type='button'
          size='sm'
          variant='ghost'
          onClick={() => onRemoveTask(task.taskId)}
        >
          <Trash2 />
          删除记录
        </Button>
      </div>
    </article>
  )
}

export default DownloadTaskRow
