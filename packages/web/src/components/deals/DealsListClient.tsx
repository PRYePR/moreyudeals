'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DealCardPreisjaeger from './DealCardPreisjaeger'
import { X } from 'lucide-react'

interface DealsListClientProps {
  initialDeals: any[]
  totalCount: number
  initialPage?: number
  pageSize?: number
}

export default function DealsListClient({
  initialDeals,
  totalCount: initialTotalCount,
  initialPage = 1,
  pageSize = 20
}: DealsListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [deals, setDeals] = useState(initialDeals)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [isLoading, setIsLoading] = useState(false)

  // 获取当前筛选参数
  const currentMerchant = searchParams.get('merchant')
  const currentCategory = searchParams.get('category')
  const currentSearch = searchParams.get('search')

  // 当 props 变化时更新状态（服务端重新渲染后）
  useEffect(() => {
    setDeals(initialDeals)
    setTotalCount(initialTotalCount)
    setCurrentPage(initialPage)
  }, [initialDeals, initialTotalCount, initialPage])

  const totalPages = Math.ceil(totalCount / pageSize)
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

  // 清除筛选条件 - 使用完整页面刷新确保状态重置
  const clearFilters = useCallback(() => {
    window.location.href = '/'
  }, [])

  // 加载更多（追加模式）
  const loadMore = async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    try {
      const nextPage = currentPage + 1
      const response = await fetch(buildApiUrl(nextPage))
      const data = await response.json()

      if (data.deals && data.deals.length > 0) {
        setDeals(prev => [...prev, ...data.deals])
        setCurrentPage(nextPage)
      }
    } catch (error) {
      console.error('加载更多失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 跳转到指定页（替换模式）
  const goToPage = async (page: number) => {
    if (isLoading || page < 1 || page > totalPages || page === currentPage) return

    setIsLoading(true)
    try {
      const response = await fetch(buildApiUrl(page))
      const data = await response.json()

      if (data.deals) {
        setDeals(data.deals)
        setTotalCount(data.pagination.total)
        setCurrentPage(page)
        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (error) {
      console.error('加载页面失败:', error)
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
                onClick={clearFilters}
                className="hover:bg-brand-primary/20 rounded-full p-0.5 transition-colors"
                title="清除筛选"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {currentCategory && (
            <div className="flex items-center gap-2 bg-brand-primary/10 text-brand-primary px-3 py-1.5 rounded-full text-sm">
              <span>分类: {currentCategory}</span>
              <button
                onClick={clearFilters}
                className="hover:bg-brand-primary/20 rounded-full p-0.5 transition-colors"
                title="清除筛选"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {currentSearch && (
            <div className="flex items-center gap-2 bg-brand-primary/10 text-brand-primary px-3 py-1.5 rounded-full text-sm">
              <span>搜索: {currentSearch}</span>
              <button
                onClick={clearFilters}
                className="hover:bg-brand-primary/20 rounded-full p-0.5 transition-colors"
                title="清除筛选"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={clearFilters}
            className="ml-auto text-sm text-gray-600 hover:text-brand-primary underline transition-colors"
          >
            清除全部筛选
          </button>
        </div>
      )}

      {/* Deals Grid */}
      <div className="space-y-4">
        {deals.map((deal: any) => (
          <DealCardPreisjaeger key={deal.id} deal={deal} />
        ))}
      </div>

      {/* Empty State */}
      {deals.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">暂无优惠信息</p>
          <p className="text-gray-400 text-sm mt-2">请稍后再试</p>
        </div>
      )}

      {/* 加载更多按钮 */}
      {hasMore && deals.length > 0 && (
        <div className="flex justify-center pt-8">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="px-8 py-3 bg-brand-primary hover:bg-brand-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '加载中...' : '加载更多优惠'}
          </button>
        </div>
      )}

      {/* 分页导航 */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-4 pt-8 border-t border-gray-200">
          {/* 页码信息 */}
          <div className="text-sm text-gray-600">
            第 {currentPage} / {totalPages} 页 · 共 {totalCount} 个优惠
          </div>

          {/* 分页按钮 */}
          <div className="flex items-center gap-2">
            {/* 上一页 */}
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={isLoading || currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              上一页
            </button>

            {/* 页码按钮 */}
            <div className="flex gap-1">
              {/* 第一页 */}
              {currentPage > 3 && (
                <>
                  <button
                    onClick={() => goToPage(1)}
                    className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    1
                  </button>
                  {currentPage > 4 && (
                    <span className="w-10 h-10 flex items-center justify-center text-gray-400">...</span>
                  )}
                </>
              )}

              {/* 当前页附近的页码 */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  return Math.abs(page - currentPage) <= 2
                })
                .map(page => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    disabled={isLoading || page === currentPage}
                    className={`w-10 h-10 rounded-lg transition-colors ${
                      page === currentPage
                        ? 'bg-brand-primary text-white font-medium'
                        : 'border border-gray-300 hover:bg-gray-50'
                    } disabled:cursor-not-allowed`}
                  >
                    {page}
                  </button>
                ))}

              {/* 最后一页 */}
              {currentPage < totalPages - 2 && (
                <>
                  {currentPage < totalPages - 3 && (
                    <span className="w-10 h-10 flex items-center justify-center text-gray-400">...</span>
                  )}
                  <button
                    onClick={() => goToPage(totalPages)}
                    className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            {/* 下一页 */}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={isLoading || currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              下一页
            </button>
          </div>

          {/* 快速跳转 */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">跳转到</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              defaultValue={currentPage}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const page = parseInt((e.target as HTMLInputElement).value)
                  if (page >= 1 && page <= totalPages) {
                    goToPage(page)
                  }
                }
              }}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <span className="text-gray-600">页</span>
          </div>
        </div>
      )}
    </div>
  )
}
