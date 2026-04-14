import DownloadsFilterTabs from './DownloadsFilterTabs'
import DownloadsTaskList from './DownloadsTaskList'
import type { DownloadTask, DownloadTaskFilterValue } from '../downloads.types'

interface DownloadsPageViewProps {
  activeFilter: DownloadTaskFilterValue
  tasks: DownloadTask[]
  onFilterChange: (value: DownloadTaskFilterValue) => void
  onOpenFile: (taskId: string) => void
  onOpenFolder: (taskId: string) => void
  onRemoveTask: (taskId: string) => void
}

const DownloadsPageView = ({
  activeFilter,
  tasks,
  onFilterChange,
  onOpenFile,
  onOpenFolder,
  onRemoveTask,
}: DownloadsPageViewProps) => {
  return (
    <section className='w-full max-w-6xl space-y-6'>
      <div className=''>
        <DownloadsFilterTabs
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
        />
      </div>

      <DownloadsTaskList
        tasks={tasks}
        onOpenFile={onOpenFile}
        onOpenFolder={onOpenFolder}
        onRemoveTask={onRemoveTask}
      />
    </section>
  )
}

export default DownloadsPageView
