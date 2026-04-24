import { FolderOpen, PencilLine, RefreshCw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useConfigStore } from '@/stores/config-store'
import {
  LOCAL_LIBRARY_SCAN_FORMAT_OPTIONS,
  normalizeLocalLibraryRoots,
  normalizeLocalLibraryScanFormats,
} from '../../../../shared/config.ts'
import type { LocalLibrarySnapshot } from '../../../../shared/local-library.ts'

function ToggleSetting({
  enabled,
  disabled = false,
  onToggle,
}: {
  enabled: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <button
      type='button'
      disabled={disabled}
      aria-pressed={enabled}
      onClick={onToggle}
      className={cn(
        'bg-muted/60 relative h-9 w-full rounded-full px-1 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        enabled
          ? 'bg-primary/90 text-primary-foreground'
          : 'text-muted-foreground'
      )}
    >
      <span
        aria-hidden
        className={cn(
          'bg-background absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full shadow-sm transition-transform duration-300',
          enabled ? 'translate-x-full' : 'translate-x-0'
        )}
      />
      <span className='relative z-10 grid h-full grid-cols-2 items-center'>
        <span
          className={cn('transition-colors', !enabled && 'text-foreground')}
        >
          关闭
        </span>
        <span className={cn('transition-colors', enabled && 'text-foreground')}>
          开启
        </span>
      </span>
    </button>
  )
}

const LocalLibrarySettings = () => {
  const showLocalLibraryMenu = useConfigStore(
    state => state.config.showLocalLibraryMenu
  )
  const localLibraryRoots = useConfigStore(
    state => state.config.localLibraryRoots
  )
  const localLibraryScanFormats = useConfigStore(
    state => state.config.localLibraryScanFormats
  )
  const localLibraryOnlineLyricMatchEnabled = useConfigStore(
    state => state.config.localLibraryOnlineLyricMatchEnabled
  )
  const downloadDir = useConfigStore(state => state.config.downloadDir)
  const isConfigLoading = useConfigStore(state => state.isLoading)
  const setConfig = useConfigStore(state => state.setConfig)
  const [snapshot, setSnapshot] = useState<LocalLibrarySnapshot | null>(null)

  const loadSnapshot = useCallback(async () => {
    try {
      const nextSnapshot = await window.electronLocalLibrary?.getSnapshot()
      setSnapshot(nextSnapshot ?? null)
    } catch (error) {
      console.error('failed to load local library snapshot in settings', error)
    }
  }, [])

  useEffect(() => {
    void loadSnapshot()
  }, [loadSnapshot])

  const handleSyncRoots = async (nextRoots: string[]) => {
    const localLibraryApi = window.electronLocalLibrary
    if (!localLibraryApi) {
      return
    }

    // 删除目录只同步索引差异，避免每次目录调整都把保留目录重新全盘扫描一遍。
    await localLibraryApi.syncRoots(nextRoots)
  }

  const handleAddDirectories = async () => {
    const localLibraryApi = window.electronLocalLibrary
    if (!localLibraryApi) {
      toast.error('当前环境不支持本地乐库目录选择')
      return
    }

    try {
      const selectedDirectories = await localLibraryApi.selectDirectories()
      if (!selectedDirectories.length) {
        return
      }

      const nextRoots = normalizeLocalLibraryRoots([
        ...localLibraryRoots,
        ...selectedDirectories,
      ])

      // 目录配置只保留根目录集合，避免把扫描结果混进用户配置存储。
      await setConfig('localLibraryRoots', nextRoots)
      await handleSyncRoots(nextRoots)
      await localLibraryApi.scan()
      await loadSnapshot()
      toast.success('目录已添加，并已自动刷新导入数据')
    } catch (error) {
      console.error('failed to select local library directories', error)
      toast.error('添加本地乐库目录失败，请稍后重试')
    }
  }

  const handleOpenDirectory = async (targetPath: string) => {
    const didOpen = await window.electronLocalLibrary?.openDirectory(targetPath)
    if (!didOpen) {
      toast.error('打开目录失败，请稍后重试')
    }
  }

  const handleRemoveDirectory = async (targetPath: string) => {
    const nextRoots = normalizeLocalLibraryRoots(
      localLibraryRoots.filter(directoryPath => directoryPath !== targetPath)
    )

    await setConfig('localLibraryRoots', nextRoots)
    await handleSyncRoots(nextRoots)
    await loadSnapshot()
  }

  const handleScan = async () => {
    try {
      await window.electronLocalLibrary?.scan()
      await loadSnapshot()
      toast.success('本地乐库扫描完成')
    } catch (error) {
      console.error('failed to scan local library from settings', error)
      toast.error('本地乐库扫描失败，请稍后重试')
    }
  }

  const handleAddDownloadDirectory = async () => {
    const localLibraryApi = window.electronLocalLibrary
    if (!localLibraryApi || !downloadDir.trim()) {
      return
    }

    const nextRoots = normalizeLocalLibraryRoots([
      ...localLibraryRoots,
      downloadDir.trim(),
    ])

    await setConfig('localLibraryRoots', nextRoots)
    await handleSyncRoots(nextRoots)
    await localLibraryApi.scan()
    await loadSnapshot()
    toast.success('下载目录已加入，并已自动刷新导入数据')
  }

  const handleToggleScanFormat = async (format: string) => {
    const nextFormats = localLibraryScanFormats.includes(format as never)
      ? localLibraryScanFormats.filter(item => item !== format)
      : [...localLibraryScanFormats, format]

    const normalizedFormats = normalizeLocalLibraryScanFormats(nextFormats)
    // 至少保留一种扫描格式，避免用户把过滤条件清空后误以为本地乐库导入失效。
    if (
      normalizedFormats.length === localLibraryScanFormats.length &&
      normalizedFormats.every(
        (item, index) => item === localLibraryScanFormats[index]
      )
    ) {
      return
    }

    await setConfig('localLibraryScanFormats', normalizedFormats)
  }

  return (
    <div className='space-y-1'>
      <div className='grid grid-cols-[minmax(0,1fr)_minmax(240px,280px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            显示本地乐库
          </div>
          <p className='text-muted-foreground text-xs'>
            只控制顶部导航入口显隐，不删除已导入的本地目录和索引数据。
          </p>
        </div>
        <ToggleSetting
          enabled={showLocalLibraryMenu}
          disabled={isConfigLoading}
          onToggle={() =>
            void setConfig('showLocalLibraryMenu', !showLocalLibraryMenu)
          }
        />
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(240px,280px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            在线补齐本地歌词与封面
          </div>
          <p className='text-muted-foreground text-xs'>
            本地歌曲缺歌词或缺封面时，播放中会按内置网易云接口自动补齐并写回本地。
          </p>
        </div>
        <ToggleSetting
          enabled={localLibraryOnlineLyricMatchEnabled}
          disabled={isConfigLoading}
          onToggle={() =>
            void setConfig(
              'localLibraryOnlineLyricMatchEnabled',
              !localLibraryOnlineLyricMatchEnabled
            )
          }
        />
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(240px,280px)] gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            本地乐库目录
          </div>
          <p className='text-muted-foreground text-xs'>
            支持多个根目录，扫描时会递归收集受支持的音频文件。
          </p>
        </div>
        <div className='space-y-3'>
          {localLibraryRoots.length === 0 ? (
            <div className='text-muted-foreground rounded-2xl border px-4 py-3 text-sm'>
              还没有配置本地乐库目录。
            </div>
          ) : (
            localLibraryRoots.map(directoryPath => (
              <div
                key={directoryPath}
                className='bg-muted/20 border-border/70 flex items-center gap-2 rounded-2xl border px-3 py-3'
              >
                <div className='text-foreground min-w-0 flex-1 truncate text-sm'>
                  {directoryPath}
                </div>
                <Button
                  type='button'
                  size='sm'
                  variant='ghost'
                  className='rounded-xl'
                  onClick={() => void handleOpenDirectory(directoryPath)}
                >
                  <FolderOpen className='size-4' />
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant='ghost'
                  className='rounded-xl'
                  onClick={() => void handleRemoveDirectory(directoryPath)}
                >
                  <Trash2 className='size-4' />
                </Button>
              </div>
            ))
          )}

          <Button
            type='button'
            variant='outline'
            className='w-full rounded-2xl'
            onClick={() => void handleAddDirectories()}
          >
            <PencilLine className='size-4' />
            添加目录
          </Button>
        </div>
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(240px,280px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            手动扫描
          </div>
          <p className='text-muted-foreground text-xs'>
            本地乐库不会在启动时自动全盘扫描，避免给主线程和磁盘带来额外负担。
          </p>
          <p className='text-muted-foreground text-xs'>
            最近扫描：
            {snapshot?.stats.lastScannedAt
              ? new Date(snapshot.stats.lastScannedAt).toLocaleString('zh-CN')
              : '尚未扫描'}
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          className='rounded-2xl'
          disabled={localLibraryRoots.length === 0}
          onClick={() => void handleScan()}
        >
          <RefreshCw className='size-4' />
          立即扫描
        </Button>
      </div>
      <Separator />

      {downloadDir.trim() ? (
        <>
          <div className='grid grid-cols-[minmax(0,1fr)_minmax(240px,280px)] items-center gap-6 py-3'>
            <div className='space-y-1'>
              <div className='text-muted-foreground text-sm font-medium'>
                将下载目录加入本地乐库
              </div>
              <p className='text-muted-foreground text-xs break-all'>
                {downloadDir}
              </p>
            </div>
            <Button
              type='button'
              variant='outline'
              className='rounded-2xl'
              disabled={localLibraryRoots.includes(downloadDir.trim())}
              onClick={() => void handleAddDownloadDirectory()}
            >
              加入下载目录
            </Button>
          </div>
          <Separator />
        </>
      ) : null}

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(240px,280px)] gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            扫描格式
          </div>
          <p className='text-muted-foreground text-xs'>
            默认全选。只会在扫描时导入勾选的音频格式，不会修改你的本地文件。
          </p>
        </div>
        <div className='grid grid-cols-2 gap-2 rounded-2xl border px-4 py-3'>
          {LOCAL_LIBRARY_SCAN_FORMAT_OPTIONS.map(option => (
            <label
              key={option.value}
              className={cn(
                'hover:bg-muted/35 flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 transition-colors',
                localLibraryScanFormats.includes(option.value) && 'bg-muted/40'
              )}
            >
              <Checkbox
                checked={localLibraryScanFormats.includes(option.value)}
                onCheckedChange={() =>
                  void handleToggleScanFormat(option.value)
                }
              />
              <span className='text-sm font-medium'>{option.label}</span>
            </label>
          ))}
        </div>
      </div>
      <Separator />
    </div>
  )
}

export default LocalLibrarySettings
