import { create } from 'zustand'
import type { DailySongsStoreState } from '@/types/core'

// 每日推荐歌曲缓存，首页和每日推荐入口共享。
export const useDailySongs = create<DailySongsStoreState>((set, get) => ({
  // 当前每日推荐列表。
  list: [],
  // 覆盖每日推荐列表。
  setList: list => {
    return set({ list })
  },
  // 取首条推荐用于首页卡片展示。
  get getTopOne() {
    return get().list.slice(0, 1)
  },
}))
