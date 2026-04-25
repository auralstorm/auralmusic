import type { ReactNode } from 'react'

import MediaDetailHero from '@/components/MediaDetailHero'

interface LocalLibraryEntityDetailHeroProps {
  coverUrl: string | null
  title: string
  subtitle: string
  metaItems: string[]
  description?: string
  actions?: ReactNode
  onPlay?: () => void
}

const LocalLibraryEntityDetailHero = ({
  coverUrl,
  title,
  subtitle,
  metaItems,
  description,
  actions,
  onPlay,
}: LocalLibraryEntityDetailHeroProps) => {
  return (
    <MediaDetailHero
      type='playlist'
      title={title}
      coverUrl={coverUrl ?? ''}
      subtitle={subtitle}
      metaItems={metaItems}
      description={description}
      favoriteVisible={false}
      moreActions={actions}
      onPlay={onPlay}
      isResize={false}
    />
  )
}

export default LocalLibraryEntityDetailHero
