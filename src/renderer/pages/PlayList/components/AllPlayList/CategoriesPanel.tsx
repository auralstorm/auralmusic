import { cn } from '@/lib/utils'
import { useMemo } from 'react'

interface PlaylistCategoryItem {
  name: string
  category?: number
}

interface PlaylistCategories {
  sub?: PlaylistCategoryItem[]
  categories?: Record<string, string>
}

interface CategoriesPanelProps {
  categoryData?: PlaylistCategories
  className?: string
  currentCat?: string | null
  onSelect?: (categoryName: string) => void
}

const CategoriesPanel = ({
  categoryData,
  className,
  currentCat,
  onSelect,
}: CategoriesPanelProps) => {
  const groupedCategories = useMemo(() => {
    const { sub = [], categories = {} } = categoryData ?? {}

    const catIdToName = Object.entries(categories).reduce(
      (map, [key, name]) => {
        map[Number(key)] = name
        return map
      },
      {} as Record<number, string>
    )

    const grouped = Object.values(categories).reduce(
      (result, name) => {
        result[name] = []
        return result
      },
      {} as Record<string, PlaylistCategoryItem[]>
    )

    sub.forEach(item => {
      const catName = item.category ? catIdToName[item.category] : undefined
      if (catName) {
        grouped[catName].push(item)
      }
    })

    return grouped
  }, [categoryData])

  return (
    <div className={cn('bg-background w-full space-y-8 p-4', className)}>
      {Object.entries(groupedCategories).map(([categoryName, list]) => (
        <div key={categoryName} className='flex'>
          <h3 className='mr-[30px] mb-2 text-lg font-bold'>{categoryName}</h3>
          <div className='grid flex-1 grid-cols-8 gap-5'>
            {list.map(item => (
              <span
                key={item.name}
                className={cn(
                  'hover:bg-primary/20 cursor-pointer rounded px-3 py-1 text-center transition-colors',
                  currentCat === item.name && 'bg-primary/20 font-semibold'
                )}
                onClick={() => onSelect?.(item.name)}
              >
                {item.name}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default CategoriesPanel
