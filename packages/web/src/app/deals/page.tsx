'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import DealCard from '@/components/DealCard'
import { createModuleLogger } from '@/lib/logger'

const logger = createModuleLogger('app:deals-page')

interface Deal {
  id: string
  title: string
  originalTitle: string
  translatedTitle: string
  description: string
  originalDescription: string
  translatedDescription: string
  price: string
  originalPrice?: string
  currency: string
  discountPercentage?: number
  categories: string[]
  category: string
  imageUrl: string
  dealUrl: string
  source: string
  publishedAt: Date | string
  expiresAt: Date | string
  language: 'de' | 'en'
  translationProvider: 'deepl' | 'microsoft' | 'google'
  isTranslated: boolean
  isExpired: boolean
  daysRemaining: number
}

function DealsContent() {
  const searchParams = useSearchParams()
  const categoryFilter = searchParams.get('category')

  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryFilter || '')
  const [availableCategories, setAvailableCategories] = useState<string[]>([])

  const dealsPerPage = 12

  useEffect(() => {
    fetchDeals()
  }, [])

  useEffect(() => {
    if (categoryFilter) {
      setSelectedCategory(categoryFilter)
    }
  }, [categoryFilter])

  const fetchDeals = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/deals/live?limit=100')
      const data = await response.json()

      if (data.deals && Array.isArray(data.deals)) {
        setDeals(data.deals)

        // Extract all unique categories
        const categories = new Set<string>()
        data.deals.forEach((deal: Deal) => {
          if (deal.category) categories.add(deal.category)
          if (deal.categories) {
            deal.categories.forEach(cat => categories.add(cat))
          }
        })
        setAvailableCategories(Array.from(categories).sort())
      } else {
        setError('Failed to load deals')
      }
    } catch (err) {
      setError('Network error occurred')
      logger.error('Error fetching deals', err as Error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDeals = deals.filter(deal => {
    if (!selectedCategory) return true
    return deal.category === selectedCategory || deal.categories?.includes(selectedCategory)
  })

  const totalPages = Math.ceil(filteredDeals.length / dealsPerPage)
  const currentDeals = filteredDeals.slice(
    (currentPage - 1) * dealsPerPage,
    currentPage * dealsPerPage
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="h-12 bg-gray-100 border-b border-gray-200"></div>
                  <div className="p-4 flex gap-4">
                    <div className="w-32 h-32 bg-gray-200 rounded"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/2 mt-auto"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">加载失败</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDeals}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">所有优惠</h1>
          <p className="text-gray-600">
            浏览最新的奥地利优惠信息 • 共 {filteredDeals.length} 个优惠
            {selectedCategory && ` • 分类：${selectedCategory}`}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            按分类筛选：
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value)
              setCurrentPage(1) // Reset to first page
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">所有分类</option>
            {availableCategories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          {selectedCategory && (
            <button
              onClick={() => {
                setSelectedCategory('')
                setCurrentPage(1)
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              清除筛选
            </button>
          )}
        </div>

        {/* Deals Grid - Responsive: Mobile 1 column, Desktop 2 columns */}
        {currentDeals.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {currentDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  上一页
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = currentPage <= 3 ? i + 1 :
                                   currentPage >= totalPages - 2 ? totalPages - 4 + i :
                                   currentPage - 2 + i
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 text-sm rounded-lg ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {selectedCategory ? '该分类下暂无优惠' : '暂无优惠信息'}
            </h2>
            <p className="text-gray-600">
              {selectedCategory ? (
                <>
                  尝试 <button onClick={() => setSelectedCategory('')} className="text-blue-600 hover:text-blue-700">浏览所有分类</button> 或稍后再试
                </>
              ) : (
                '请稍后再试，或返回首页查看最新内容'
              )}
            </p>
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function DealsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <DealsContent />
    </Suspense>
  )
}