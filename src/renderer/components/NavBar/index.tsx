import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { Link } from 'react-router-dom'
import React from 'react'
import { routeMenuConfig } from '../../router/router.config'
import Icon from '../Icon'

const NavBar = () => {
  // 取根布局的 children 作为菜单数据源（因为根布局 hidden）
  const menuData = routeMenuConfig[0]?.children || []
  return (
    <nav className='w-full h-full flex items-center justify-center px-4'>
      <NavigationMenu>
        <NavigationMenuList>
          {menuData.map(
            item =>
              !item.meta.hidden && (
                <NavigationMenuItem key={item.meta.title}>
                  <NavigationMenuLink asChild>
                    <Link to={item.path} className='font-bold text-[15px]'>
                      {item.meta.icon && <Icon name={item.meta.icon} className='w-4 h-4 mr-2' />}
                      {item.meta.title}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              )
          )}
        </NavigationMenuList>
      </NavigationMenu>
    </nav>
  )
}

export default NavBar
