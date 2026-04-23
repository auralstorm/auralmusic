import { Link, useNavigate } from 'react-router-dom'
import type { NewAlbumListProps } from '../types'
import { NewAlbumSkeleton } from './HomeSkeletons'
import ArtistCover from '@/components/ArtistCover'

const NewAlbumList = ({
  list = [],
  isLoading = false,
  onPlayAlbum,
}: NewAlbumListProps) => {
  const navigate = useNavigate()

  const navigateToAlbumDetail = (albumId: number) => {
    if (!albumId) return
    navigate(`/albums/${albumId}`)
  }

  const navigateToArtistDetail = (artistId?: number) => {
    if (!artistId) return
    navigate(`/artists/${artistId}`)
  }

  return (
    <div className='mt-10'>
      <div className='group mb-10 flex items-center justify-between'>
        <div className='text-2xl font-semibold'>新专速递</div>
        <Link to='/albums' className='hover:font-bold'>
          更多
        </Link>
      </div>

      {isLoading ? (
        <NewAlbumSkeleton />
      ) : (
        <div className='grid w-full grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-8 2xl:grid-cols-6 2xl:gap-8'>
          {list.map(item => (
            <ArtistCover
              artistCoverUrl={item.picUrl}
              subTitle={item.artist.name}
              artistName={item.name}
              key={item.id}
              onPlay={() => onPlayAlbum?.(item)}
              onClickCover={() => navigateToAlbumDetail(item.id)}
              onClickSubTitle={() => navigateToArtistDetail(item.artist?.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default NewAlbumList
