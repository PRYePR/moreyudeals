'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import DealCardWaterfall from './DealCardWaterfall'
import FloatingActionMenu from '../FloatingActionMenu'

// 动态导入 react-masonry-css，禁用 SSR
const Masonry = dynamic(() => import('react-masonry-css'), { ssr: false })

interface Category {
  id: string
  name: string
  translatedName: string
  count: number
}

interface Merchant {
  name: string
  count: number
  available?: boolean
}

interface DealsListClientProps {
  initialDeals: any[]
  totalCount: number
  initialPage?: number
  pageSize?: number
  categories?: Category[]
  merchants?: Merchant[]
  merchantByCategory?: Record<string, Record<string, number>>
  categoryByMerchant?: Record<string, Record<string, number>>
  filteredMerchants?: Merchant[]
  availableCategories?: Array<{ id: string; count: number }>
}

export default function DealsWaterfallClient({
  initialDeals,
  totalCount: initialTotalCount,
  initialPage = 1,
  pageSize = 20,
  categories = [],
  merchants = [],
  merchantByCategory,
  categoryByMerchant,
  filteredMerchants,
  availableCategories
}: DealsListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 状态
  const [deals, setDeals] = useState(initialDeals)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [isLoading, setIsLoading] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)

  // 获取当前筛选参数
  const currentMerchant = searchParams.get('merchant')
  const currentCategory = searchParams.get('category')
  const currentSearch = searchParams.get('search')

  // 获取分类的中文翻译
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId.toLowerCase())
    return category?.translatedName || categoryId
  }

  // 当 initialDeals 变化时同步更新（筛选条件变化）
  // Intercepting Routes 会自动保持滚动位置，无需手动恢复
  useEffect(() => {
    setDeals(initialDeals)
    setTotalCount(initialTotalCount)
    setCurrentPage(initialPage)
  }, [initialDeals, initialTotalCount, initialPage])

  // 监听滚动显示"返回顶部"按钮
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
        const updatedDeals = [...deals, ...data.deals]
        const nextTotal = data.pagination?.total ?? totalCount

        setDeals(updatedDeals)
        setCurrentPage(nextPage)
        setTotalCount(nextTotal)
      }
    } catch (error) {
      console.error('加载更多失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
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
            <DealCardWaterfall deal={deal} currentDeals={deals} />
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
          {/* 加载状态 */}
          {hasMore ? (
            <div className="w-full flex justify-center">
              {isLoading ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                  <span>加载中...</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={loadMore}
                  className="px-8 py-3 bg-brand-primary hover:bg-brand-hover text-white font-medium rounded-lg transition-colors"
                >
                  加载更多优惠
                </button>
              )}
            </div>
          ) : (
            /* 已加载全部 */
            totalCount > 0 && (
              <div className="text-sm text-gray-500">
                已显示全部 {totalCount} 个优惠 🎉
              </div>
            )
          )}
        </div>
      )}

      {/* 浮动按钮菜单 */}
      <FloatingActionMenu
        showBackToTop={showBackToTop}
        categories={categories}
        merchants={merchants}
        currentCategory={currentCategory}
        currentMerchant={currentMerchant}
        merchantByCategory={merchantByCategory}
        categoryByMerchant={categoryByMerchant}
        filteredMerchants={filteredMerchants}
        availableCategories={availableCategories}
      />
    </div>
  )
}
