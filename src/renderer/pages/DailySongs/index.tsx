import { useEffect, useState } from 'react'
import { getRecommendSongs } from '@/api/list'
import DailySongsHero from './components/DailySongsHero'
import DailySongsSkeleton from './components/DailySongsSkeleton'
import {
  EMPTY_DAILY_SONGS_STATE,
  normalizeDailySongs,
  type DailySongsPageState,
} from './daily-songs.model'
import TrackList from '@/components/TrackList'

const DailySongs = () => {
  const [state, setState] = useState<DailySongsPageState>(
    EMPTY_DAILY_SONGS_STATE
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true

    const fetchDailySongs = async () => {
      setLoading(true)
      setError('')
      setState(EMPTY_DAILY_SONGS_STATE)

      try {
        const response = await getRecommendSongs()

        if (!isActive) {
          return
        }

        setState({
          songs: normalizeDailySongs(response.data),
        })
      } catch (fetchError) {
        if (!isActive) {
          return
        }

        console.error('daily songs fetch failed', fetchError)
        setError('每日推荐歌曲加载失败，请稍后重试')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    void fetchDailySongs()

    return () => {
      isActive = false
    }
  }, [])

  return (
    <section className='relative isolate min-h-full overflow-hidden'>
      <DailySongsHero totalSongs={state.songs.length} />

      {loading && state.songs.length === 0 ? (
        <DailySongsSkeleton />
      ) : error && state.songs.length === 0 ? (
        <div className='mx-auto px-4 pb-10 md:px-6'>
          <div className='px-6 py-12 text-center text-sm'>{error}</div>
        </div>
      ) : (
        <TrackList data={state.songs} />
      )}
    </section>
  )
}

export default DailySongs
