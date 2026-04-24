import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useScrollToTopOnRouteEnter } from '@/hooks/useScrollToTopOnRouteEnter'
import { cn } from '@/lib/utils'
import AboutSettings from './components/AboutSettings'
import BasicSettings from './components/BasicSettings'
import DownloadSettings from './components/DownloadSettings'
import LocalLibrarySettings from './components/LocalLibrarySettings'
import PlaySettings from './components/PlaySettings'
import ShortcutKeySettings from './components/ShortcutKeySettings'
import SystemSettings from './components/SystemSettings'
import type { SettingsTabValue, SettingsTabsNavProps } from './types'

const SETTINGS_TABS = [
  { label: '基础设置', value: 'basic' },
  { label: '播放设置', value: 'play' },
  { label: '下载设置', value: 'download' },
  { label: '本地乐库', value: 'localLibrary' },
  { label: '系统设置', value: 'system' },
  { label: '快捷键', value: 'shortcutKeys' },
  { label: '关于', value: 'about' },
] as const

const SettingsTabsNav = ({ value }: SettingsTabsNavProps) => {
  const activeIndex = SETTINGS_TABS.findIndex(tab => tab.value === value)

  return (
    <TabsList className='relative h-[35px] w-full overflow-hidden rounded-xl p-1'>
      <span
        aria-hidden
        className='bg-background absolute top-1 bottom-1 left-1 rounded-lg shadow-sm transition-transform duration-300 ease-out'
        style={{
          width: `calc((100% - 0.5rem) / ${SETTINGS_TABS.length})`,
          transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
        }}
      />
      {SETTINGS_TABS.map(tab => (
        <TabsTrigger
          key={tab.value}
          value={tab.value}
          className={cn(
            'z-10 cursor-pointer bg-transparent transition-colors after:hidden data-active:border-transparent data-active:bg-transparent! data-active:shadow-none dark:data-active:border-transparent dark:data-active:bg-transparent!',
            value === tab.value
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}

const Settings = () => {
  useScrollToTopOnRouteEnter()

  const [activeTab, setActiveTab] = useState<SettingsTabValue>('basic')

  return (
    <section className='w-full space-y-8 pb-12'>
      <Tabs
        value={activeTab}
        onValueChange={value => setActiveTab(value as SettingsTabValue)}
        className='w-full'
      >
        <SettingsTabsNav value={activeTab} />
        <TabsContent value='basic'>
          <BasicSettings />
        </TabsContent>
        <TabsContent value='play'>
          <PlaySettings />
        </TabsContent>
        <TabsContent value='download'>
          <DownloadSettings />
        </TabsContent>
        <TabsContent value='localLibrary'>
          <LocalLibrarySettings />
        </TabsContent>
        <TabsContent value='system'>
          <SystemSettings />
        </TabsContent>
        <TabsContent value='shortcutKeys'>
          <ShortcutKeySettings />
        </TabsContent>
        <TabsContent value='about'>
          <AboutSettings />
        </TabsContent>
      </Tabs>
    </section>
  )
}

export default Settings
