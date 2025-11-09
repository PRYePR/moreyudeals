import { create } from 'zustand'

interface DealsState {
  // 只在"点击商品->详情页->返回"这条路径上使用
  returnFromDetail: boolean
  cachedDeals: any[]
  cachedScrollPosition: number

  // 保存状态（点击商品卡片时调用）
  saveStateForReturn: (deals: any[], scrollPosition: number) => void

  // 清空状态（使用完毕后立即清空）
  clearReturnState: () => void
}

export const useDealsStore = create<DealsState>((set) => ({
  returnFromDetail: false,
  cachedDeals: [],
  cachedScrollPosition: 0,

  saveStateForReturn: (deals, scrollPosition) => set({
    returnFromDetail: true,
    cachedDeals: deals,
    cachedScrollPosition: scrollPosition
  }),

  clearReturnState: () => set({
    returnFromDetail: false,
    cachedDeals: [],
    cachedScrollPosition: 0
  })
}))
