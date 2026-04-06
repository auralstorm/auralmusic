import GenreChartsCardItem from './GenreChartsCardItem'
import type { OnlineChartSummary } from '../CoreRankings/CoreRankingCardItem.type'

interface GenreChartsProps {
  list: OnlineChartSummary[]
}

const GenreCharts = ({ list }: GenreChartsProps) => {
  return (
    <div className='w-full'>
      <div className='text-2xl font-bold mt-10 mb-4'>全球排行榜</div>
      <div className='w-full grid gap-5 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-6 3xl:grid-cols-8'>
        {list.map(chart => (
          <GenreChartsCardItem key={chart.id} chart={chart} onOpen={i => console.log(i)} />
        ))}
      </div>
    </div>
  )
}

export default GenreCharts
