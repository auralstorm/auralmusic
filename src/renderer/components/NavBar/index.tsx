import { Link } from 'react-router-dom'
import { useMemo } from 'react'

import { routeMenuConfig } from '@/router/router.config'
import { useAuthStore } from '@/stores/auth-store'
import { useConfigStore } from '@/stores/config-store'

import Icon from '../Icon'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu'

const NavBar = () => {
  const menuData = routeMenuConfig[0]?.children || []
  const loginStatus = useAuthStore(state => state.loginStatus)
  const isAuthenticated = loginStatus === 'authenticated'
  const showLocalLibraryMenu = useConfigStore(
    state => state.config.showLocalLibraryMenu
  )
  const visibleMenuData = useMemo(() => {
    // 先裁剪成稳定菜单数组，避免 Radix 收集 children 时把条件分支残留成旧节点。
    return menuData.filter(item => {
      if (item.meta.hidden) {
        return false
      }

      if (item.path === '/local-library' && !showLocalLibraryMenu) {
        return false
      }

      if (item.meta.authOnly && !isAuthenticated) {
        return false
      }

      return true
    })
  }, [isAuthenticated, menuData, showLocalLibraryMenu])

  return (
    <nav className='window-no-drag group flex h-full w-full items-center justify-center px-4'>
      <NavigationMenu>
        <NavigationMenuList>
          {visibleMenuData.map(item => (
            <NavigationMenuItem key={item.meta.title}>
              <NavigationMenuLink asChild>
                <Link to={item.path} className='px-8 text-[20px] font-bold'>
                  {item.meta.icon && (
                    <Icon name={item.meta.icon} className='mr-2 h-4 w-4' />
                  )}
                  {item.meta.title}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    </nav>
  )
}

export default NavBar
