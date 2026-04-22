import { memo, useCallback, useState } from 'react'

import { ChevronDown, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { LIBRARY_TAB_OPTIONS, PLAYLIST_FILTER_OPTIONS } from '../library.model'
import type {
  LibraryTabValue,
  PlaylistSourceValue,
  LibraryTabsSectionProps,
} from '../types'
import LibraryAlbumPanel from './LibraryAlbumPanel'
import LibraryArtistPanel from './LibraryArtistPanel'
import LibraryCloudPanel from './LibraryCloudPanel'
import LibraryMvPanel from './LibraryMvPanel'
import LibraryPlaylistPanel from './LibraryPlaylistPanel'

const LibraryTabsSection = ({
  data,
  playlistLoading = false,
  onOpenPlaylist,
  onOpenMv,
  playlistSource,
  onPlaylistSourceChange,
  onOpenCreatePlaylist,
}: LibraryTabsSectionProps) => {
  const [activeTab, setActiveTab] = useState<LibraryTabValue>('playlists')
  const handleActiveTabChange = useCallback((value: string) => {
    setActiveTab(value as LibraryTabValue)
  }, [])
  const handleOpenPlaylistsTab = useCallback(() => {
    setActiveTab('playlists')
  }, [])
  const handlePlaylistSourceValueChange = useCallback(
    (value: string) => {
      setActiveTab('playlists')
      onPlaylistSourceChange(value as PlaylistSourceValue)
    },
    [onPlaylistSourceChange]
  )

  const currentPlaylistLabel =
    PLAYLIST_FILTER_OPTIONS.find(option => option.value === playlistSource)
      ?.label || '我的歌单'

  return (
    <section className='w-full space-y-6'>
      <div className='grid w-full items-center'>
        <Tabs
          value={activeTab}
          onValueChange={handleActiveTabChange}
          className='w-full'
        >
          <div className='relative flex w-full items-center justify-between gap-4'>
            <TabsList variant='line' className='bg-transparent p-0'>
              <div
                className={`relative flex inline-flex w-[150px] items-center justify-between rounded-[14px] px-4 py-2.5 text-base font-semibold transition-colors ${
                  activeTab === 'playlists'
                    ? 'text-primary/90'
                    : 'text-foreground/60 hover:text-foreground'
                }`}
              >
                <button
                  type='button'
                  onClick={handleOpenPlaylistsTab}
                  className='cursor-pointer'
                >
                  {currentPlaylistLabel}
                </button>

                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type='button'
                      aria-label='切换歌单来源'
                      className='hover:bg-primary/20 text-primary/50 ml-2 inline-flex size-5 items-center justify-center rounded-full transition-colors hover:text-neutral-800'
                    >
                      <ChevronDown className='size-3.5' />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align='start' className='min-w-[140px]'>
                    <DropdownMenuRadioGroup
                      value={playlistSource}
                      onValueChange={handlePlaylistSourceValueChange}
                    >
                      {PLAYLIST_FILTER_OPTIONS.map(option => (
                        <DropdownMenuRadioItem
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                {activeTab === 'playlists' ? (
                  <span className='bg-primary absolute right-0 bottom-[-5px] left-0 h-0.5' />
                ) : null}
              </div>

              {LIBRARY_TAB_OPTIONS.filter(
                option => option.value !== 'playlists'
              ).map(option => (
                <TabsTrigger
                  key={option.value}
                  value={option.value}
                  className='rounded-[14px] px-4 py-2.5 text-base font-semibold data-active:bg-neutral-100 data-active:text-neutral-950'
                >
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {activeTab === 'playlists' && playlistSource === 'my' ? (
              <Button
                type='button'
                variant='ghost'
                onClick={onOpenCreatePlaylist}
                className='text-primary/50 absolute right-0 h-10 rounded-[16px] px-5 text-base font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.04)]'
              >
                <Plus className='mr-2 size-4' />
                新建歌单
              </Button>
            ) : (
              <div />
            )}
          </div>

          <TabsContent value='playlists' className='w-full pt-6'>
            <LibraryPlaylistPanel
              playlists={data.playlists}
              loading={playlistLoading}
              onOpen={onOpenPlaylist}
            />
          </TabsContent>

          <TabsContent value='albums' className='w-full pt-6'>
            <LibraryAlbumPanel active={activeTab === 'albums'} />
          </TabsContent>

          <TabsContent value='artists' className='w-full pt-6'>
            <LibraryArtistPanel active={activeTab === 'artists'} />
          </TabsContent>

          <TabsContent value='mvs' className='w-full pt-6'>
            <LibraryMvPanel active={activeTab === 'mvs'} onOpen={onOpenMv} />
          </TabsContent>

          <TabsContent value='cloud' className='w-full pt-6'>
            <LibraryCloudPanel active={activeTab === 'cloud'} />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}

export default memo(LibraryTabsSection)
