'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import DealCardWaterfall from './DealCardWaterfall'
import FloatingActionMenu from '../FloatingActionMenu'
import { X } from 'lucide-react'
import { useDealsStore } from '@/store/dealsStore'

// 动态导入 react-masonry-css，禁用 SSR
const Masonry = dynamic(() => import('react-masonry-css'), { ssr: false })

interface Category {
  id: string
  name: string
  translatedName: string
  count: number
}

interface DealsListClientProps {
  initialDeals: any[]
  totalCount: number
  initialPage?: number
  pageSize?: number
  categories?: Category[]
}

export default function DealsWaterfallClient({
  initialDeals,
  totalCount: initialTotalCount,
  initialPage = 1,
  pageSize = 20,
  categories = []
}: DealsListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // 使用 Zustand store
  const {
    deals: cachedDeals,
    currentPage: cachedPage,
    totalCount: cachedTotal,
    scrollPosition: cachedScrollPosition,
    setDeals,
    appendDeals,
    setCurrentPage: setCachedPage,
    setTotalCount: setCachedTotal,
    setScrollPosition
  } = useDealsStore()

  const [isLoading, setIsLoading] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const hasRestoredScroll = useRef(false)

  // 决定使用缓存还是初始数据
  const deals = cachedDeals.length > 0 ? cachedDeals : initialDeals
  const currentPage = cachedDeals.length > 0 ? cachedPage : initialPage
  const totalCount = cachedDeals.length > 0 ? cachedTotal : initialTotalCount

  // 获取当前筛选参数
  const currentMerchant = searchParams.get('merchant')
  const currentCategory = searchParams.get('category')
  const currentSearch = searchParams.get('search')

  // 获取分类的中文翻译
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId.toLowerCase())
    return category?.translatedName || categoryId
  }

  // 初始化或更新缓存
  useEffect(() => {
    // 如果没有缓存，使用服务端数据初始化
    if (cachedDeals.length === 0) {
      setDeals(initialDeals)
      setCachedPage(initialPage)
      setCachedTotal(initialTotalCount)
    }
  }, [initialDeals, initialPage, initialTotalCount, cachedDeals.length, setDeals, setCachedPage, setCachedTotal])

  // 恢复滚动位置（只恢复一次）
  useEffect(() => {
    if (cachedScrollPosition > 0 && !hasRestoredScroll.current && deals.length > 0) {
      hasRestoredScroll.current = true

      // 等待 Masonry 渲染完成后恢复
      const timer = setTimeout(() => {
        window.scrollTo({
          top: cachedScrollPosition,
          behavior: 'auto'  // 使用 auto 而不是 smooth，更精确
        })
        // 恢复后清除缓存的位置，避免重复触发
        setScrollPosition(0)
      }, 600)

      return () => clearTimeout(timer)
    }
  }, [cachedScrollPosition, deals.length, setScrollPosition])

  // 监听滚动显示"返回顶部"按钮（不再实时保存滚动位置）
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 无限滚动：监听滚动到底部
  useEffect(() => {
    if (!hasMore || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first.isIntersecting) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals.length, totalCount, isLoading])

  const hasMore = deals.length < totalCount

  // 构建带筛选参数的 URL
  const buildApiUrl = useCallback((page: number) => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('limit', pageSize.toString())

    if (currentMerchant) params.set('merchant', currentMerchant)
    if (currentCategory) params.set('category', currentCategory)
    if (currentSearch) params.set('search', currentSearch)

    return `/api/deals/live?${params.toString()}`
  }, [pageSize, currentMerchant, currentCategory, currentSearch])

  // 移除单个筛选条件
  const removeFilter = useCallback((filterType: 'merchant' | 'category' | 'search') => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete(filterType)
    params.delete('page') // 重置分页

    const queryString = params.toString()
    router.push(queryString ? `/?${queryString}` : '/')
  }, [searchParams, router])

  // 清除所有筛选条件
  const clearAllFilters = useCallback(() => {
    const layout = searchParams.get('layout')
    router.push(layout ? `/?layout=${layout}` : '/')
  }, [router, searchParams])

  // 加载更多（追加模式）
  const loadMore = async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    try {
      const nextPage = currentPage + 1
      const response = await fetch(buildApiUrl(nextPage))
      const data = await response.json()

      if (data.deals && data.deals.length > 0) {
        // 追加到 Zustand store
        appendDeals(data.deals)
        setCachedPage(nextPage)
        if (data.pagination?.total) {
          setCachedTotal(data.pagination.total)
        }
      }
    } catch (error) {
      console.error('加载更多失败:', error)
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="space-y-6">
      {/* 筛选条件显示栏 */}
      {(currentMerchant || currentCategory || currentSearch) && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-600 font-medium">当前筛选:</span>

          {currentMerchant && (
            <div className="flex items-center gap-2 bg-brand-primary/10 text-brand-primary px-3 py-1.5 rounded-full text-sm">
              <span>商家: {currentMerchant}</span>
              <button
                onClick={() => removeFilter('merchant')}
                className="hover:bg-brand-primary/20 rounded-full p-0.5 transition-colors"
                title="移除商家筛选"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {currentCategory && (
            <div className="flex items-center gap-2 bg-brand-primary/10 text-brand-primary px-3 py-1.5 rounded-full text-sm">
              <span>分类: {getCategoryName(currentCategory)}</span>
              <button
                onClick={() => removeFilter('category')}
                className="hover:bg-brand-primary/20 rounded-full p-0.5 transition-colors"
                title="移除分类筛选"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {currentSearch && (
            <div className="flex items-center gap-2 bg-brand-primary/10 text-brand-primary px-3 py-1.5 rounded-full text-sm">
              <span>搜索: {currentSearch}</span>
              <button
                onClick={() => removeFilter('search')}
                className="hover:bg-brand-primary/20 rounded-full p-0.5 transition-colors"
                title="移除搜索筛选"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={clearAllFilters}
            className="ml-auto text-sm text-gray-600 hover:text-brand-primary underline transition-colors"
          >
            清除全部筛选
          </button>
        </div>
      )}

      {/* Deals 瀑布流布局 - react-masonry-css */}
      <Masonry
        breakpointCols={{
          default: 4,
          1536: 4,  // 2xl
          1280: 3,  // xl
          1024: 3,  // lg
          768: 3,   // md
          640: 2,   // sm
        }}
        className="flex -ml-3 md:-ml-4 w-auto"
        columnClassName="pl-3 md:pl-4 bg-clip-padding"
      >
        {deals.map((deal: any) => (
          <div key={deal.id} className="mb-3 md:mb-4">
            <DealCardWaterfall deal={deal} />
          </div>
        ))}
      </Masonry>

      {/* Empty State */}
      {deals.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">暂无优惠信息</p>
          <p className="text-gray-400 text-sm mt-2">请稍后再试或调整筛选条件</p>
        </div>
      )}

      {/* 加载进度和状态 */}
      {deals.length > 0 && (
        <div className="flex flex-col items-center gap-4 pt-8 border-t border-gray-200">
          {/* 加载进度 */}
          <div className="text-sm text-gray-600">
            已加载 <span className="font-semibold text-brand-primary">{deals.length}</span> / {totalCount} 个优惠
          </div>

          {/* 加载状态 */}
          {hasMore && (
            <div ref={loadMoreRef} className="w-full flex justify-center">
              {isLoading ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                  <span>加载中...</span>
                </div>
              ) : (
                <button
                  onClick={loadMore}
                  className="px-8 py-3 bg-brand-primary hover:bg-brand-hover text-white font-medium rounded-lg transition-colors"
                >
                  加载更多优惠
                </button>
              )}
            </div>
          )}

          {/* 已加载全部 */}
          {!hasMore && totalCount > 0 && (
            <div className="text-sm text-gray-500">
              已显示全部 {totalCount} 个优惠 🎉
            </div>
          )}
        </div>
      )}

      {/* 浮动按钮菜单 */}
      <FloatingActionMenu showBackToTop={showBackToTop} />
    </div>
  )
}
