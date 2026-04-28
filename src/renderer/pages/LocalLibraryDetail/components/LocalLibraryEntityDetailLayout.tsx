import type { ReactNode } from 'react'

interface LocalLibraryEntityDetailLayoutProps {
  hero: ReactNode
  children: ReactNode
}

const LocalLibraryEntityDetailLayout = ({
  hero,
  children,
}: LocalLibraryEntityDetailLayoutProps) => {
  return (
    <section className='space-y-8 pb-12'>
      <div>{hero}</div>

      <div>{children}</div>
    </section>
  )
}

export default LocalLibraryEntityDetailLayout
