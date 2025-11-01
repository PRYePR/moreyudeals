'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface FilterSidebarProps {
  merchants?: Array<{ name: string; count: number }>
  currentMerchant?: string | null
  currentSort?: string | null
}

const SORT_OPTIONS = [
  { id: 'publishedAt-desc', label: '最新', value: { sortBy: 'publishedAt', sortOrder: 'desc' } },
  { id: 'discount-desc', label: '折扣最高', value: { sortBy: 'discount', sortOrder: 'desc' } },
  { id: 'price-asc', label: '价格最低', value: { sortBy: 'price', sortOrder: 'asc' } },
  { id: 'price-desc', label: '价格最高', value: { sortBy: 'price', sortOrder: 'desc' } },
  { id: 'expiresAt-asc', label: '即将过期', value: { sortBy: 'expiresAt', sortOrder: 'asc' } },
]

export default function FilterSidebar({ merchants = [], currentMerchant, currentSort }: FilterSidebarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [sortExpanded, setSortExpanded] = useState(true)
  const [filterExpanded, setFilterExpanded] = useState(true)

  // 获取当前排序选项
  const currentSortBy = searchParams.get('sortBy') || 'publishedAt'
  const currentSortOrder = searchParams.get('sortOrder') || 'desc'
  const currentSortId = `${currentSortBy}-${currentSortOrder}`

  const handleSortChange = (option: typeof SORT_OPTIONS[0]) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sortBy', option.value.sortBy)
    params.set('sortOrder', option.value.sortOrder)
    params.delete('page') // 重置分页

    router.push(`/?${params.toString()}`)
  }

  const handleMerchantToggle = (merchant: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (currentMerchant === merchant) {
      // 取消选中当前商家 - 只删除 merchant 参数，保留其他所有参数
      params.delete('merchant')
    } else {
      // 选中新商家
      params.set('merchant', merchant)
    }

    // 重置分页，但保留其他筛选参数（category, search, sortBy, sortOrder等）
    params.delete('page')

    // 构建新 URL
    const queryString = params.toString()

    // 如果有任何参数，使用带参数的 URL；否则返回首页
    // 注意：即使只剩下 category 等其他参数，也要保留
    if (queryString) {
      router.push(`/?${queryString}`)
    } else {
      router.push('/')
    }
  }

  const handleResetFilters = () => {
    const params = new URLSearchParams()
    // 保留分类参数
    const category = searchParams.get('category')
    if (category) {
      params.set('category', category)
    }

    const queryString = params.toString()
    router.push(queryString ? `/?${queryString}` : '/')
  }

  const hasActiveFilters = currentMerchant || currentSortId !== 'publishedAt-desc'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">筛选</h3>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-sm text-brand-primary hover:text-brand-hover underline"
          >
            重置
          </button>
        )}
      </div>

      {/* 排序 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => setSortExpanded(!sortExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <span className="font-semibold text-gray-900">排序</span>
          {sortExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {sortExpanded && (
          <div className="px-4 pb-4 space-y-2">
            {SORT_OPTIONS.map((option) => {
              const isActive = currentSortId === option.id

              return (
                <label
                  key={option.id}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="radio"
                    name="sort"
                    checked={isActive}
                    onChange={() => handleSortChange(option)}
                    className="w-4 h-4 text-brand-primary border-gray-300 focus:ring-brand-primary"
                  />
                  <span className={`text-sm ${
                    isActive ? 'text-brand-primary font-medium' : 'text-gray-700 group-hover:text-brand-primary'
                  }`}>
                    {option.label}
                  </span>
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* 商家筛选 */}
      {merchants.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => setFilterExpanded(!filterExpanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <span className="font-semibold text-gray-900">商家</span>
            {filterExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {filterExpanded && (
            <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
              {merchants.slice(0, 20).map((merchant) => {
                const isActive = currentMerchant === merchant.name

                return (
                  <label
                    key={merchant.name}
                    className="flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => handleMerchantToggle(merchant.name)}
                        className="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                      />
                      <span className={`text-sm ${
                        isActive ? 'text-brand-primary font-medium' : 'text-gray-700 group-hover:text-brand-primary'
                      }`}>
                        {merchant.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {merchant.count}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 设置 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-3">设置</h4>
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            className="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
            defaultChecked={false}
          />
          <span className="text-sm text-gray-700 group-hover:text-brand-primary">
            仅显示有效优惠
          </span>
        </label>
      </div>
    </div>
  )
}
