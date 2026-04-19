import Header from '@/components/Header'
import LazyCollectToPlaylistDrawer from '@/components/CollectToPlaylistDrawer/LazyCollectToPlaylistDrawer'
import PlaybackControl from '@/components/PlaybackControl'
import PlaybackEngine from '@/components/PlaybackControl/PlaybackEngine'
import PlaybackSessionBridge from '@/components/PlaybackSessionBridge'
import PlaybackShortcutBridge from '@/components/PlaybackShortcutBridge'
import TrayCommandBridge from '@/components/TrayCommandBridge'
import ScrollToTopButton from '@/components/ScrollToTopButton'
import KeepAliveRouteOutlet from 'keepalive-for-react-router'
import { Toaster } from '@/components/ui/sonner'
import { isWindowsPlatform } from '@/lib/electron-runtime'
import { useAnimationEffect } from '@/hooks/useAnimationEffect'
import { useSystemFont } from '@/hooks/useSystemFont'
import PlayerScene from '@/components/PlayerScene'

const AppLayout = () => {
  const isWindows = isWindowsPlatform()
  useAnimationEffect()
  useSystemFont()

  return (
    <main
      className={`w-full px-12 pb-[100px] xl:px-25 2xl:px-50 ${
        isWindows ? 'pt-20' : 'pt-25'
      }`}
    >
      <Header className='window-drag fixed top-0 right-0 left-0 z-50 pt-5 pb-1.25' />
      <div className='flex w-full items-center justify-center py-2'>
        <KeepAliveRouteOutlet
          include={['/', '/albums', '/artists', '/playlist']}
        />
      </div>
      <PlaybackEngine />
      <PlaybackSessionBridge />
      <PlaybackShortcutBridge />
      <TrayCommandBridge />
      <PlaybackControl />
      <PlayerScene />
      <LazyCollectToPlaylistDrawer />
      <Toaster />
      <ScrollToTopButton />
    </main>
  )
}

export default AppLayout
