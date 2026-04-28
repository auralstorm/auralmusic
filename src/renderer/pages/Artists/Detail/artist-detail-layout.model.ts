export const ARTIST_DETAIL_HERO_LAYOUT = {
  grid: 'grid items-center gap-8 lg:grid-cols-[320px_minmax(0,1fr)]',
  content: 'mt-2 flex min-w-0 flex-col justify-center gap-5 py-4',
  avatar: 'w-68',
  moreButton: 'w-[100px] rounded-full py-7',
} as const

export const ARTIST_DETAIL_HERO_SKELETON_LAYOUT = {
  avatar: 'aspect-square w-68 rounded-full',
  title: 'h-14 w-64 rounded-full',
  meta: 'mt-5 h-6 w-72 rounded-full',
  summary: 'h-[108px] w-full rounded-[24px]',
  moreButton: 'h-14 w-[100px] rounded-full',
} as const
