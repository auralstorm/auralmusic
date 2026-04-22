import { memo } from 'react'

import { Play } from 'lucide-react'

import LibraryQuickSongList from './LibraryQuickSongList'
import type { LibraryHeroProps } from '../types'

const LibraryHero = ({
  songs,
  songCount,
  coverImgUrl: _coverImgUrl,
  likedSongsPreviewRefreshing = false,
  onOpenLikedSongs,
  onSongLikeChangeSuccess,
}: LibraryHeroProps) => {
  return (
    <section className='space-y-6'>
      <div className='grid grid-cols-[1fr_2fr] gap-5'>
        <div
          role='button'
          tabIndex={0}
          aria-label='打开我喜欢的音乐详情页'
          className='group relative min-h-[240px] cursor-pointer overflow-hidden rounded-[32px] border border-[#d8e4ff] p-6 text-left shadow-2xl transition-transform outline-none hover:-translate-y-0.5'
          onClick={onOpenLikedSongs}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOpenLikedSongs()
            }
          }}
        >
          {_coverImgUrl ? (
            <>
              <div
                className='absolute inset-0 scale-110 bg-cover bg-center opacity-50 blur-md'
                style={{
                  backgroundImage: `url("${_coverImgUrl}")`,
                }}
              />
              {/* <div className='absolute inset-0 bg-[linear-gradient(135deg,rgba(232,240,255,0.78)_0%,rgba(214,226,255,0.72)_55%,rgba(192,210,255,0.82)_100%)]' /> */}
            </>
          ) : (
            <div className='absolute inset-0 bg-[linear-gradient(135deg,#e8f0ff_0%,#d6e2ff_55%,#c0d2ff_100%)]' />
          )}

          {/* <div className='absolute inset-0 bg-white/60 backdrop-blur-[4px]' /> */}

          <div className='relative z-10 flex h-full flex-col justify-between'>
            <div className='space-y-2'>
              <p className='text-sm leading-6'>收藏过的歌都在这里</p>
            </div>

            <div className='flex items-end justify-between gap-4'>
              <div>
                <h2 className='text-3xl tracking-[-0.05em]'>我喜欢的音乐</h2>
                <p className='mt-1 text-sm font-medium'>{songCount} 首</p>
              </div>

              <div
                className='bg-primary text-background flex size-12 items-center justify-center rounded-full shadow-2xl transition-transform group-hover:scale-105'
                aria-hidden='true'
              >
                <Play className='ml-0.5 size-5 fill-current' />
              </div>
            </div>
          </div>
        </div>

        <LibraryQuickSongList
          songs={songs}
          refreshing={likedSongsPreviewRefreshing}
          onSongLikeChangeSuccess={onSongLikeChangeSuccess}
        />
      </div>
    </section>
  )
}

export default memo(LibraryHero)
