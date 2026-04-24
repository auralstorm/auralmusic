import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'

interface LocalLibraryEmptyStateProps {
  state: 'missing-roots' | 'not-scanned' | 'empty-library'
  isScanning?: boolean
  importedTrackCount?: number
  onImport: () => void
  onScan: () => void
}

const EMPTY_STATE_COPY = {
  'missing-roots': {
    title: '还没有添加本地音乐目录',
    description:
      '直接选择一个或多个音乐文件夹立即导入，后续也可以在设置里继续管理目录。',
    actionLabel: '立即导入',
    actionKey: 'import',
  },
  'not-scanned': {
    title: '目录已添加，等待首次扫描',
    description: '目录导入后会自动开始首次扫描，避免再多一次手动确认。',
    actionLabel: null,
    actionKey: null,
  },
  'empty-library': {
    title: '没有发现可导入的音频文件',
    description: '当前目录里没有受支持的音频格式，或文件已经被移走。',
    actionLabel: '重新扫描',
    actionKey: 'scan',
  },
} as const

const LocalLibraryEmptyState = ({
  state,
  isScanning = false,
  importedTrackCount = 0,
  onImport,
  onScan,
}: LocalLibraryEmptyStateProps) => {
  const copy = EMPTY_STATE_COPY[state]

  return (
    <div className='bg-muted/20 border-border/60 flex min-h-72 flex-col items-center justify-center rounded-[28px] border px-6 text-center'>
      {isScanning ? null : (
        <>
          <h2 className='text-foreground text-2xl font-bold'>{copy.title}</h2>
          <p className='text-muted-foreground mt-3 max-w-xl text-sm leading-6'>
            {copy.description}
          </p>
        </>
      )}
      {isScanning ? (
        <div className='flex flex-col items-center gap-2'>
          <Spinner className='text-primary size-7' />
          <p className='text-muted-foreground text-sm'>
            当前已导入 {importedTrackCount} 首歌曲
          </p>
        </div>
      ) : copy.actionKey ? (
        <Button
          className='mt-6 rounded-2xl'
          onClick={copy.actionKey === 'import' ? onImport : onScan}
        >
          {copy.actionLabel}
        </Button>
      ) : null}
    </div>
  )
}

export default LocalLibraryEmptyState
