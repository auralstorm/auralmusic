import { UserRound } from 'lucide-react'

const LoginArtwork = () => {
  return (
    <div className='relative hidden min-h-[560px] overflow-hidden bg-[linear-gradient(135deg,#ede9df_0%,#dfdbd1_100%)] lg:flex lg:flex-col lg:justify-between lg:p-10'>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,rgba(255,255,255,0.72),transparent_28%),radial-gradient(circle_at_22%_78%,rgba(255,255,255,0.55),transparent_24%)]' />

      <div className='relative z-10 mx-auto flex max-w-[360px] flex-1 flex-col items-center justify-center text-center'>
        <div className='app-intel-light-surface bg-background/70 text-foreground flex size-20 items-center justify-center rounded-[28px] shadow-[0_18px_70px_rgba(15,23,42,0.08)] backdrop-blur'>
          <UserRound className='size-9' />
        </div>
        <h2 className='mt-8 text-4xl font-black tracking-[-0.06em] text-neutral-950'>
          Welcome back
        </h2>
        <p className='mt-4 text-base leading-7 text-neutral-600'>
          登录成功后会自动同步账号信息。
        </p>
      </div>
    </div>
  )
}

export default LoginArtwork
