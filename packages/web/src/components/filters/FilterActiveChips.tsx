'use client'

import { X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Category {
  id: string
  name: string
  translatedName: string
}

interface FilterActiveChipsProps {
  currentCategory?: string | null
  currentMerchant?: string | null
  currentSearch?: string | null
  categories: Category[]
}

export default function FilterActiveChips({
  currentCategory,
  currentMerchant,
  currentSearch,
  categories,
}: FilterActiveChipsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 检查是否有活动的筛选条件（不包括搜索，搜索由 SearchTermBanner 单独显示）
  const hasActiveFilters = currentCategory || currentMerchant

  // 如果没有筛选条件，不显示
  if (!hasActiveFilters) {
    return null
  }

  // 清除某个筛选条件
  const clearFilter = (key: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete(key)
    router.push(`/?${params.toString()}`)
  }

  // 清除所有筛选条件
  const clearAllFilters = () => {
    router.push('/')
  }

  // 获取当前选中的分类显示名称
  const getCurrentCategoryLabel = () => {
    if (!currentCategory || currentCategory === 'all') return null
    const category = categories.find(c => c.id === currentCategory)
    return category?.translatedName || currentCategory
  }

  const categoryLabel = getCurrentCategoryLabel()

  return (
    <div className="hidden lg:block bg-gray-50 border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600 font-medium">已选:</span>

          {/* 分类筛选 */}
          {categoryLabel && (
            <button
              onClick={() => clearFilter('category')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-300 text-sm text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors group"
            >
              <span>{categoryLabel}</span>
              <X className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
            </button>
          )}

          {/* 商家筛选 */}
          {currentMerchant && (
            <button
              onClick={() => clearFilter('merchant')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-300 text-sm text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors group"
            >
              <span>{currentMerchant}</span>
              <X className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
            </button>
          )}

          {/* 清除全部按钮 */}
          <button
            onClick={clearAllFilters}
            className="ml-auto text-sm text-brand-primary hover:text-brand-hover font-medium transition-colors"
          >
            清除全部
          </button>
        </div>
      </div>
    </div>
  )
}
