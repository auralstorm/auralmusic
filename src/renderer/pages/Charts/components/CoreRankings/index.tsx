import CoreRankingCardItem from './CoreRankingCardItem'
import type { OnlineChartSummary } from './CoreRankingCardItem.type'

interface CoreRankingsProps {
  topList?: OnlineChartSummary[]
}

const CoreRankings = ({ topList = [] }: CoreRankingsProps) => {
  return (
    <div className='w-full'>
      <div className='text-2xl font-bold mb-4'>官方榜单</div>
      <div className='grid gap-5 grid-cols-4'>
        {topList.map((chart, index) => (
          <CoreRankingCardItem
            key={chart.id}
            chart={chart}
            index={index}
            onOpen={chartId => console.log('Open chart:', chartId)}
          />
        ))}
      </div>
    </div>
  )
}

export default CoreRankings
