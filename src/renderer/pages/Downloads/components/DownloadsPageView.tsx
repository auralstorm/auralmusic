import DownloadsFilterTabs from './DownloadsFilterTabs'
import DownloadsTaskList from './DownloadsTaskList'
import type { DownloadsPageViewProps } from '../types'

const DownloadsPageView = ({
  activeFilter,
  tasks,
  onFilterChange,
  onOpenFile,
  onOpenFolder,
  onRemoveTask,
}: DownloadsPageViewProps) => {
  return (
    <section className='w-full space-y-6'>
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
