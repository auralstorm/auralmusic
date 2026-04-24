import type { RouteMenuConfig } from '@/types/core'
import AppLayout from '@/layout/AppLayout'

import {
  Home,
  DailySongs,
  Library,
  LocalLibrary,
  LikedSongs,
  Settings,
  Downloads,
  Charts,
  PlayList,
  PlaylistDetail,
  MvDetail,
  Artists,
  ArtistDetail,
  ArtistSongs,
  Albums,
  AlbumDetail,
} from './routeComponents'

export const routeMenuConfig: RouteMenuConfig[] = [
  {
    path: '/',
    element: <AppLayout />,
    meta: { hidden: true, title: 'App Layout' },
    children: [
      {
        path: '/',
        element: <Home />,
        meta: { title: '首页', icon: '' },
      },
      {
        path: '/daily-songs',
        element: <DailySongs />,
        meta: { title: '每日推荐', icon: '', hidden: true },
      },
      {
        path: '/library',
        element: <Library />,
        meta: { title: '音乐库', icon: '', authOnly: true },
      },
      {
        path: '/library/liked-songs',
        element: <LikedSongs />,
        meta: { title: '我喜欢的音乐', icon: '', hidden: true, authOnly: true },
      },
      {
        path: '/settings',
        element: <Settings />,
        meta: { title: '设置', icon: '', hidden: true },
      },
      {
        path: '/downloads',
        element: <Downloads />,
        meta: { title: '下载管理', icon: '', hidden: true },
      },
      {
        path: '/charts',
        element: <Charts />,
        meta: { title: '排行榜', icon: '' },
      },
      {
        path: '/playlist',
        element: <PlayList />,
        meta: { title: '歌单', icon: '' },
      },
      {
        path: '/playlist/:id',
        element: <PlaylistDetail />,
        meta: { title: '歌单详情', icon: '', hidden: true },
      },
      {
        path: '/mv/:id',
        element: <MvDetail />,
        meta: { title: 'MV详情', icon: '', hidden: true },
      },
      {
        path: '/artists',
        element: <Artists />,
        meta: { title: '歌手', icon: '' },
      },
      {
        path: '/artists/:id',
        element: <ArtistDetail />,
        meta: { title: '歌手详情', icon: '', hidden: true },
      },
      {
        path: '/artists/:id/songs',
        element: <ArtistSongs />,
        meta: { title: '歌手歌曲列表', icon: '', hidden: true },
      },
      {
        path: '/albums',
        element: <Albums />,
        meta: { title: '专辑', icon: '', hidden: true },
      },
      {
        path: '/albums/:id',
        element: <AlbumDetail />,
        meta: { title: '专辑详情', icon: '', hidden: true },
      },
      {
        path: '/local-library',
        element: <LocalLibrary />,
        meta: { title: '本地乐库', icon: '' },
      },
    ],
  },
]
