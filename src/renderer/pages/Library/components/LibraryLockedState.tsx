import { LockKeyhole, LogIn } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'

const LibraryLockedState = () => {
  const openLoginDialog = useAuthStore(state => state.openLoginDialog)

  return (
    <section className='flex min-h-[70vh] items-center justify-center py-10'>
      <div className='border-border/70 bg-card/80 w-full max-w-[900px] rounded-[34px] border p-10 shadow-[0_30px_90px_rgba(15,23,42,0.08)]'>
        <div className='mx-auto flex max-w-[520px] flex-col items-center text-center'>
          <div className='bg-primary/10 text-primary flex size-16 items-center justify-center rounded-[24px]'>
            <LockKeyhole className='size-8' />
          </div>
          <h1 className='mt-6 text-4xl font-black tracking-[-0.05em] text-neutral-950'>
            乐库仅限登录用户可见
          </h1>
          <p className='mt-4 text-base leading-7 text-neutral-600'>
            登录后可以浏览你的歌单、专辑、艺人和 MV。
          </p>

          <Button
            className='mt-8 h-11 rounded-full px-6 text-base font-semibold'
            onClick={() => openLoginDialog('email')}
          >
            <LogIn className='mr-2 size-4' />
            去登录
          </Button>
        </div>
      </div>
    </section>
  )
}

export default LibraryLockedState
