import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getMvDetail, getMvPlayback, getSimilarMvs } from '@/api/mv'
import { useScrollToTopOnRouteEnter } from '@/hooks/useScrollToTopOnRouteEnter'
import {
  EMPTY_MV_DETAIL_STATE,
  normalizeMvDetailHero,
  normalizeMvPlayback,
  normalizeSimilarMvs,
} from '../mv-detail.model'
import type { MvDetailPageState } from '../types'
import MvDetailHeader from './components/MvDetailHeader'
import MvDetailPlayer from './components/MvDetailPlayer'
import MvDetailSkeleton from './components/MvDetailSkeleton'
import SimilarMvSection from './components/SimilarMvSection'

function pickPlaybackQuality(resolutions: number[]) {
  const availableResolutions = resolutions.filter(Boolean).sort((a, b) => a - b)

  if (availableResolutions.length === 0) {
    return 1080
  }

  return availableResolutions[availableResolutions.length - 1] || 1080
}

const MvDetail = () => {
  useScrollToTopOnRouteEnter()

  const { id } = useParams()
  const mvId = Number(id)
  const navigate = useNavigate()
  const [state, setState] = useState<MvDetailPageState>(EMPTY_MV_DETAIL_STATE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [similarLoading, setSimilarLoading] = useState(true)
  const [similarError, setSimilarError] = useState('')

  useEffect(() => {
    if (!mvId) {
      setState(EMPTY_MV_DETAIL_STATE)
      setLoading(false)
      setSimilarLoading(false)
      setError('无效的 MV ID')
      setSimilarError('')
      return
    }

    let isActive = true

    const fetchSimilarMvs = async () => {
      setSimilarLoading(true)
      setSimilarError('')

      try {
        const response = await getSimilarMvs({ mvid: mvId })

        if (!isActive) {
          return
        }

        setState(previous => ({
          ...previous,
          similarMvs: normalizeSimilarMvs(response.data),
        }))
      } catch (fetchError) {
        if (!isActive) {
          return
        }

        console.error('similar mv fetch failed', fetchError)
        setSimilarError('相似 MV 加载失败，请稍后重试')
      } finally {
        if (isActive) {
          setSimilarLoading(false)
        }
      }
    }

    const fetchMvDetail = async () => {
      setLoading(true)
      setError('')
      setState(EMPTY_MV_DETAIL_STATE)

      try {
        const detailResponse = await getMvDetail({ mvid: mvId })

        if (!isActive) {
          return
        }

        const hero = normalizeMvDetailHero(detailResponse.data)

        if (!hero) {
          setError('暂无 MV 详情数据')
          return
        }

        const playbackResponse = await getMvPlayback({
          id: mvId,
          r: pickPlaybackQuality(hero.resolutions),
        })

        if (!isActive) {
          return
        }

        setState(previous => ({
          ...previous,
          hero,
          playback: normalizeMvPlayback(playbackResponse.data),
        }))
      } catch (fetchError) {
        if (!isActive) {
          return
        }

        console.error('mv detail fetch failed', fetchError)
        setError('MV 详情加载失败，请稍后重试')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    void fetchSimilarMvs()
    void fetchMvDetail()

    return () => {
      isActive = false
    }
  }, [mvId])

  const handleOpenSimilarMv = (similarMvId: number) => {
    if (!similarMvId || similarMvId === mvId) {
      return
    }

    navigate(`/mv/${similarMvId}`)
  }

  if (loading && !state.hero) {
    return <MvDetailSkeleton />
  }

  if (error && !state.hero) {
    return (
      <section className='pb-8'>
        <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
          {error}
        </div>
      </section>
    )
  }

  if (!state.hero) {
    return (
      <section className='pb-8'>
        <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
          暂无 MV 详情数据
        </div>
      </section>
    )
  }

  return (
    <section className='space-y-10 pb-8'>
      <MvDetailPlayer
        hero={state.hero}
        playback={state.playback}
        loading={loading}
      />
      <MvDetailHeader hero={state.hero} />
      <SimilarMvSection
        items={state.similarMvs}
        loading={similarLoading}
        error={similarError}
        onOpen={handleOpenSimilarMv}
      />
    </section>
  )
}

export default MvDetail
