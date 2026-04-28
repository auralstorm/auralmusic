import { create } from 'zustand'

import type { PlaybackQueueDrawerStoreState } from '@/types/core'

export const usePlaybackQueueDrawerStore =
  create<PlaybackQueueDrawerStoreState>(set => ({
    // 播放队列抽屉开关。
    open: false,
    // 受控设置队列抽屉开关。
    setOpen: open => set({ open }),
    // 打开播放队列抽屉。
    openDrawer: () => set({ open: true }),
    // 关闭播放队列抽屉。
    closeDrawer: () => set({ open: false }),
    // 切换播放队列抽屉开关。
    toggleDrawer: () => set(state => ({ open: !state.open })),
  }))
