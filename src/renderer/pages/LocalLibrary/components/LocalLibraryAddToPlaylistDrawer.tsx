import { FolderPlus, ListMusic, Plus, X } from 'lucide-react'

import AvatarCover from '@/components/AvatarCover'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import type {
  LocalLibraryPlaylistRecord,
  LocalLibraryTrackRecord,
} from '../../../../shared/local-library.ts'

interface LocalLibraryAddToPlaylistDrawerProps {
  open: boolean
  track: LocalLibraryTrackRecord | null
  playlists: LocalLibraryPlaylistRecord[]
  pendingPlaylistId: number | null
  createTitle: string
  createSubmitting?: boolean
  duplicatePlaylistIds?: Set<number>
  onOpenChange: (open: boolean) => void
  onCreateTitleChange: (value: string) => void
  onCreateAndAdd: () => void
  onAdd: (playlist: LocalLibraryPlaylistRecord) => void
}

const LocalLibraryAddToPlaylistDrawer = ({
  open,
  track,
  playlists,
  pendingPlaylistId,
  createTitle,
  createSubmitting = false,
  duplicatePlaylistIds = new Set<number>(),
  onOpenChange,
  onCreateTitleChange,
  onCreateAndAdd,
  onAdd,
}: LocalLibraryAddToPlaylistDrawerProps) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction='right'>
      <DrawerContent
        data-vaul-custom-container='true'
        data-vaul-no-drag
        className='border-border/70 bg-background/96 !top-4 !right-4 !bottom-4 h-auto w-[calc(100vw-32px)] max-w-none rounded-[30px] border p-0 shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur-2xl data-[vaul-drawer-direction=right]:!top-4 data-[vaul-drawer-direction=right]:!right-4 data-[vaul-drawer-direction=right]:!bottom-4 data-[vaul-drawer-direction=right]:!h-auto data-[vaul-drawer-direction=right]:!w-[calc(100vw-32px)] data-[vaul-drawer-direction=right]:!max-w-none data-[vaul-drawer-direction=right]:!rounded-[30px] data-[vaul-drawer-direction=right]:!border data-[vaul-drawer-direction=right]:sm:!w-[420px] data-[vaul-drawer-direction=right]:sm:!max-w-[420px]'
      >
        <DrawerHeader className='flex-row items-start justify-between gap-3 border-b px-5 py-4'>
          <div className='space-y-1'>
            <DrawerTitle className='text-lg font-semibold'>
              添加到歌单
            </DrawerTitle>
            <DrawerDescription>
              选择一个本地歌单，或先新建歌单再加入当前歌曲。
            </DrawerDescription>
          </div>

          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={() => onOpenChange(false)}
            className='rounded-full'
            aria-label='关闭本地歌单抽屉'
          >
            <X className='size-4' />
          </Button>
        </DrawerHeader>

        {track ? (
          <>
            <div className='border-b px-5 py-4'>
              <div className='flex items-center gap-4 rounded-[22px] border border-white/80 bg-white/82 p-3 shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:border-white/8 dark:bg-white/4'>
                {track.coverUrl ? (
                  <AvatarCover url={track.coverUrl} className='w-14 shrink-0' />
                ) : (
                  <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br from-[#f2ecff] via-[#eef3ff] to-[#f9f2ff] text-[#7b72ff] dark:from-[#232339] dark:via-[#1d2436] dark:to-[#231c34] dark:text-[#a69fff]'>
                    <ListMusic className='size-7' />
                  </div>
                )}
                <div className='min-w-0'>
                  <div className='truncate text-[15px] font-semibold'>
                    {track.title}
                  </div>
                  <div className='text-muted-foreground truncate text-sm'>
                    {track.artistName}
                  </div>
                </div>
              </div>
            </div>

            <div className='border-b px-5 py-4'>
              <div className='flex items-center gap-3'>
                <Input
                  value={createTitle}
                  maxLength={80}
                  placeholder='输入新歌单名称'
                  className='h-11 rounded-2xl'
                  onChange={event => onCreateTitleChange(event.target.value)}
                />
                <Button
                  type='button'
                  className='rounded-full'
                  disabled={createSubmitting || !createTitle.trim()}
                  onClick={onCreateAndAdd}
                >
                  <FolderPlus className='size-4' />
                  {createSubmitting ? '创建中' : '新建并添加'}
                </Button>
              </div>
            </div>

            <div className='flex-1 overflow-y-auto px-5 py-4'>
              <div className='space-y-2'>
                {playlists.map(playlist => {
                  const alreadyExists = duplicatePlaylistIds.has(playlist.id)
                  const isPending = pendingPlaylistId === playlist.id

                  return (
                    <button
                      key={playlist.id}
                      type='button'
                      className='flex w-full items-center gap-3 rounded-[20px] border border-white/70 bg-white/82 px-4 py-3 text-left shadow-[0_14px_36px_rgba(15,23,42,0.05)] transition-colors hover:bg-white dark:border-white/8 dark:bg-white/4 dark:hover:bg-white/8'
                      disabled={alreadyExists || isPending}
                      onClick={() => onAdd(playlist)}
                    >
                      {playlist.coverUrl ? (
                        <AvatarCover
                          url={playlist.coverUrl}
                          className='w-12 shrink-0'
                        />
                      ) : (
                        <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-gradient-to-br from-[#f2ecff] via-[#eef3ff] to-[#f9f2ff] text-[#7b72ff] dark:from-[#232339] dark:via-[#1d2436] dark:to-[#231c34] dark:text-[#a69fff]'>
                          <ListMusic className='size-6' />
                        </div>
                      )}
                      <div className='min-w-0 flex-1'>
                        <div className='truncate text-sm font-semibold'>
                          {playlist.name}
                        </div>
                        <div className='text-muted-foreground text-xs'>
                          {playlist.trackCount} 首歌曲
                        </div>
                      </div>
                      <div className='shrink-0'>
                        {alreadyExists ? (
                          <span className='text-muted-foreground text-xs'>
                            已在歌单中
                          </span>
                        ) : (
                          <div className='bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full'>
                            <Plus className='size-4' />
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
                {playlists.length === 0 ? (
                  <div className='text-muted-foreground py-10 text-center text-sm'>
                    还没有本地歌单，先创建一个再把歌曲加进去。
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}

export default LocalLibraryAddToPlaylistDrawer
