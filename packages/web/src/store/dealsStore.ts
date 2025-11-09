import { create } from 'zustand'

interface DealsState {
  deals: any[]
  currentPage: number
  totalCount: number
  scrollPosition: number
  setDeals: (deals: any[]) => void
  appendDeals: (newDeals: any[]) => void
  setCurrentPage: (page: number) => void
  setTotalCount: (count: number) => void
  setScrollPosition: (position: number) => void
  reset: () => void
}

export const useDealsStore = create<DealsState>((set) => ({
  deals: [],
  currentPage: 1,
  totalCount: 0,
  scrollPosition: 0,

  setDeals: (deals) => set({ deals }),

  appendDeals: (newDeals) => set((state) => ({
    deals: [...state.deals, ...newDeals]
  })),

  setCurrentPage: (page) => set({ currentPage: page }),

  setTotalCount: (count) => set({ totalCount: count }),

  setScrollPosition: (position) => set({ scrollPosition: position }),

  reset: () => set({
    deals: [],
    currentPage: 1,
    totalCount: 0,
    scrollPosition: 0
  })
}))
