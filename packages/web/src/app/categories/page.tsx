'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createModuleLogger } from '@/lib/logger'

const logger = createModuleLogger('app:categories-page')

interface Deal {
  id: string
  title: string
  translatedTitle: string
  categories: string[]
  category: string
  imageUrl?: string
  source: string
  publishedAt: string
  isExpired: boolean
  daysRemaining: number
}

interface CategoryData {
  name: string
  count: number
  deals: Deal[]
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/deals/live?limit=50')
      const data = await response.json()

      if (data.success && data.deals) {
        const categoryMap = new Map<string, Deal[]>()

        data.deals.forEach((deal: Deal) => {
          const allCategories = [...(deal.categories || []), deal.category].filter(Boolean)

          allCategories.forEach(category => {
            if (!categoryMap.has(category)) {
              categoryMap.set(category, [])
            }
            categoryMap.get(category)!.push(deal)
          })
        })

        const categoriesData = Array.from(categoryMap.entries())
          .map(([name, deals]) => ({
            name,
            count: deals.length,
            deals: deals.slice(0, 6) // 只显示前6个deals
          }))
          .sort((a, b) => b.count - a.count)

        setCategories(categoriesData)
      }
    } catch (error) {
      logger.error('Error fetching categories', error as Error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md p-6">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="grid grid-cols-2 gap-2">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="h-20 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">优惠分类</h1>
          <p className="text-gray-600">
            浏览不同分类的奥地利优惠信息，找到您感兴趣的商品
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <div
              key={category.name}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {category.name}
                </h2>
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                  {category.count} 个优惠
                </span>
              </div>

              {/* Sample Deals */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {category.deals.slice(0, 4).map((deal, dealIndex) => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200"
                  >
                    {deal.imageUrl ? (
                      <img
                        src={deal.imageUrl}
                        alt={deal.translatedTitle}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <span className="text-xs text-gray-500 text-center p-1">
                          {deal.translatedTitle.substring(0, 30)}...
                        </span>
                      </div>
                    )}
                    {deal.isExpired && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="text-white text-xs font-medium">已过期</span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>

              {/* View All Button */}
              <Link
                href={`/deals?category=${encodeURIComponent(category.name)}`}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-lg font-medium transition-colors duration-200 block"
              >
                查看全部 {category.count} 个优惠
              </Link>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {categories.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📂</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">暂无分类数据</h2>
            <p className="text-gray-600">
              请稍后再试，或 <Link href="/" className="text-blue-600 hover:text-blue-700">返回首页</Link>
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