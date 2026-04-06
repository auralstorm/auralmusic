import { useEffect, useState } from 'react'
import CoreRankingCardList from './components/CoreRankings'
import GenreCharts from './components/GenreCharts'
import { CoreRankingsSkeleton, GenreChartsSkeleton } from './components/ChartsSkeletons'
import { getTopList, getTopListDetailById } from '@api/list'
import type { OnlineChartSummary } from './components/CoreRankings/CoreRankingCardItem.type'

const Charts = () => {
  const [topList, setTopList] = useState<OnlineChartSummary[]>([])
  const [topListDetail, setTopListDetail] = useState<OnlineChartSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCharts = async () => {
      setIsLoading(true)

      try {
        const response = await getTopList()
        const list = (response.data.list || []) as OnlineChartSummary[]
        setTopList(list)

        const top4 = list.slice(0, 4)
        const detailResponses = await Promise.all(top4.map(item => getTopListDetailById(item.id)))
        const playlistDetails = detailResponses.map(res => res.data.playlist)

        const newList = playlistDetails.map((item, index) => {
          const preview = item.tracks.slice(0, 5)
          return { ...top4[index], preview }
        })

        setTopListDetail(newList)
      } catch (error) {
        console.error('获取排行榜数据失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCharts()
  }, [])

  const topOtherList = topList.slice(5)

  return (
    <div className='w-full'>
      {isLoading ? <CoreRankingsSkeleton /> : <CoreRankingCardList topList={topListDetail} />}
      {isLoading ? <GenreChartsSkeleton /> : <GenreCharts list={topOtherList} />}
    </div>
  )
}

export default Charts
