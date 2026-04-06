import Header from '@/components/Header'
import KeepAliveRouteOutlet from 'keepalive-for-react-router'

const AppLayout = () => {
  return (
    <main className='w-full px-10 pt-20'>
      <Header className='fixed top-0 left-0 right-0 z-50' />
      <div className='w-full flex items-center justify-center py-2'>
        <KeepAliveRouteOutlet include={['/']} />
      </div>
    </main>
  )
}

export default AppLayout
