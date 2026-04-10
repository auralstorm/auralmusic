import type { LibraryPlaylistItem } from '../library.model'
import LibraryPlaylistCard from './LibraryPlaylistCard'

interface LibraryPlaylistPanelProps {
  playlists: LibraryPlaylistItem[]
  loading?: boolean
  onOpen: (id: number) => void
}

const LibraryPlaylistPanel = ({
  playlists,
  loading = false,
  onOpen,
}: LibraryPlaylistPanelProps) => {
  if (!loading && playlists.length === 0) {
    return (
      <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
        暂无歌单内容
      </div>
    )
  }

  return (
    <div className='grid grid-cols-2 gap-6 md:grid-cols-5 xl:grid-cols-6'>
      {playlists.map(playlist => (
        <LibraryPlaylistCard
          key={playlist.id}
          playlist={playlist}
          onOpen={onOpen}
        />
      ))}
    </div>
  )
}

export default LibraryPlaylistPanel
