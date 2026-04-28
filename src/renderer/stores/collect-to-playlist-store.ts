import { create } from 'zustand'

import type { CollectToPlaylistStoreState } from '@/types/core'

export const useCollectToPlaylistStore = create<CollectToPlaylistStoreState>(
  set => ({
    // 收藏到歌单抽屉开关。
    open: false,
    // 当前待收藏歌曲上下文，抽屉关闭时必须清空。
    song: null,
    // 受控设置抽屉开关；关闭时同步释放歌曲上下文。
    setOpen: open =>
      set(state => ({
        open,
        song: open ? state.song : null,
      })),
    // 打开抽屉并绑定本次要收藏的歌曲。
    openDrawer: song =>
      set({
        open: true,
        song,
      }),
    // 关闭抽屉并清理歌曲上下文。
    closeDrawer: () =>
      set({
        open: false,
        song: null,
      }),
  })
)
