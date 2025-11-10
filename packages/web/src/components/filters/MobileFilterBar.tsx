'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Search } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

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

interface MobileFilterBarProps {
  categories: Category[]
  merchants: Merchant[]
  currentCategory?: string | null
  currentMerchant?: string | null
  currentSortBy?: string | null
  currentSearch?: string | null
  merchantByCategory?: Record<string, Record<string, number>>
  categoryByMerchant?: Record<string, Record<string, number>>
  filteredMerchants?: Merchant[]
  availableCategories?: Array<{ id: string; count: number }>
}

type DropdownType = 'category' | 'merchant' | 'sort' | null

const SORT_OPTIONS = [
  { value: 'published_at', label: '最新' },
  { value: 'discount', label: '折扣最高' },
  { value: 'price_asc', label: '价格最低' },
  { value: 'price_desc', label: '价格最高' },
  { value: 'expires_at', label: '即将过期' },
]

export default function MobileFilterBar({
  categories,
  merchants,
  currentCategory,
  currentMerchant,
  currentSortBy,
  currentSearch,
  merchantByCategory,
  categoryByMerchant,
  filteredMerchants,
  availableCategories,
}: MobileFilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeDropdown, setActiveDropdown] = useState<DropdownType>(null)
  const [merchantSearchTerm, setMerchantSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 关闭下拉菜单
  const closeDropdown = () => {
    setActiveDropdown(null)
    setMerchantSearchTerm('')
  }

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown()
      }
    }

    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [activeDropdown])

  // 更新 URL 参数
  const updateParams = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    router.push(`/?${params.toString()}`)
    closeDropdown()
  }

  // 获取当前选中的分类显示名称
  const getCurrentCategoryLabel = () => {
    if (!currentCategory || currentCategory === 'all') return '全部'
    const category = categories.find(c => c.id === currentCategory)
    return category?.translatedName || '全部'
  }

  // 获取当前选中的商家显示名称
  const getCurrentMerchantLabel = () => {
    if (!currentMerchant) return '商家'
    return currentMerchant
  }

  // 获取当前排序显示名称
  const getCurrentSortLabel = () => {
    if (!currentSortBy) return '最新'
    const sort = SORT_OPTIONS.find(s => s.value === currentSortBy)
    return sort?.label || '最新'
  }

  // 处理分类联动
  const processedCategories = (() => {
    let categoriesList = [...categories]

    // 步骤1: 根据商家筛选（如果选中了商家）
    if (currentMerchant && categoryByMerchant && categoryByMerchant[currentMerchant]) {
      const merchantCategories = categoryByMerchant[currentMerchant]
      categoriesList = categoriesList.filter(cat =>
        merchantCategories[cat.id] && merchantCategories[cat.id] > 0
      )
    }

    // 步骤2: 如果有搜索条件，进一步过滤
    if (currentSearch && availableCategories && availableCategories.length > 0) {
      const availableIds = new Set(availableCategories.map(c => c.id))
      categoriesList = categoriesList.filter(cat => availableIds.has(cat.id))
    }

    return categoriesList
  })()

  // 处理商家联动和混合排序
  const processedMerchants = (() => {
    // 初始化所有商家为可用
    let merchantsList = [...merchants].map(m => ({ ...m, available: true }))

    // 步骤1: 根据分类筛选（如果选了分类）
    if (currentCategory && currentCategory !== 'all' && merchantByCategory && merchantByCategory[currentCategory]) {
      const categoryMerchants = merchantByCategory[currentCategory]
      merchantsList = merchantsList.map(m => ({
        ...m,
        available: m.available && Boolean(categoryMerchants[m.name] && categoryMerchants[m.name] > 0)
      }))
    }

    // 步骤2: 根据搜索进一步筛选（AND 关系，不是 else if）
    if (currentSearch && filteredMerchants && filteredMerchants.length > 0) {
      const searchMerchantMap = new Map(filteredMerchants.map(m => [m.name, m.available !== false]))
      merchantsList = merchantsList.map(m => ({
        ...m,
        available: m.available && (searchMerchantMap.get(m.name) !== false)
      }))
    }

    // 步骤3: 根据商家名称搜索过滤
    if (merchantSearchTerm) {
      merchantsList = merchantsList.filter(m =>
        m.name.toLowerCase().includes(merchantSearchTerm.toLowerCase())
      )
    }

    // 步骤4: 混合排序 - 可选的在前，不可选的在后，各组内按数量排序
    const availableMerchants = merchantsList.filter(m => m.available !== false).sort((a, b) => b.count - a.count)
    const unavailableMerchants = merchantsList.filter(m => m.available === false).sort((a, b) => b.count - a.count)

    return [...availableMerchants, ...unavailableMerchants]
  })()

  return (
    <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200" ref={dropdownRef}>
      {/* 筛选按钮栏 */}
      <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto scrollbar-hide">
        {/* 分类筛选 */}
        <button
          onClick={() => setActiveDropdown(activeDropdown === 'category' ? null : 'category')}
          className={`flex items-center gap-0.5 px-2.5 py-1 rounded-full border whitespace-nowrap text-xs transition-colors ${
            currentCategory && currentCategory !== 'all'
              ? 'bg-brand-primary text-white border-brand-primary'
              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
          }`}
        >
          <span>{getCurrentCategoryLabel()}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'category' ? 'rotate-180' : ''}`} />
        </button>

        {/* 商家筛选 */}
        <button
          onClick={() => setActiveDropdown(activeDropdown === 'merchant' ? null : 'merchant')}
          className={`flex items-center gap-0.5 px-2.5 py-1 rounded-full border whitespace-nowrap text-xs transition-colors ${
            currentMerchant
              ? 'bg-brand-primary text-white border-brand-primary'
              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
          }`}
        >
          <span>{getCurrentMerchantLabel()}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'merchant' ? 'rotate-180' : ''}`} />
        </button>

        {/* 排序 */}
        <button
          onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
          className="flex items-center gap-0.5 px-2.5 py-1 rounded-full border whitespace-nowrap text-xs bg-white text-gray-700 border-gray-300 hover:border-gray-400 transition-colors"
        >
          <span>{getCurrentSortLabel()}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'sort' ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* 下拉菜单 - 分类 */}
      {activeDropdown === 'category' && (
        <div className="absolute left-0 right-0 top-full bg-white border-t border-gray-200 shadow-lg max-h-96 overflow-y-auto z-50">
          <div className="p-1.5">
            <button
              onClick={() => updateParams('category', 'all')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                !currentCategory || currentCategory === 'all'
                  ? 'bg-brand-primary/10 text-brand-primary font-medium'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              全部分类
            </button>
            {processedCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => updateParams('category', category.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  currentCategory === category.id
                    ? 'bg-brand-primary/10 text-brand-primary font-medium'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {category.translatedName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 下拉菜单 - 商家 */}
      {activeDropdown === 'merchant' && (
        <div className="absolute left-0 right-0 top-full bg-white border-t border-gray-200 shadow-lg max-h-96 overflow-y-auto z-50">
          <div className="p-1.5">
            {/* 搜索框 */}
            <div className="sticky top-0 bg-white px-1 pb-1.5 mb-1.5 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索商家..."
                  value={merchantSearchTerm}
                  onChange={(e) => setMerchantSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                />
              </div>
            </div>

            <button
              onClick={() => updateParams('merchant', null)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                !currentMerchant
                  ? 'bg-brand-primary/10 text-brand-primary font-medium'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              全部商家
            </button>
            {processedMerchants.map((merchant, index) => {
              const isDisabled = merchant.available === false
              // 检查是否是第一个不可用商家（显示分隔线）
              const isFirstDisabled = isDisabled && (index === 0 || processedMerchants[index - 1]?.available !== false)

              return (
                <div key={merchant.name}>
                  {isFirstDisabled && (
                    <div className="my-1.5 border-t border-gray-200" />
                  )}
                  <button
                    onClick={() => !isDisabled && updateParams('merchant', merchant.name)}
                    disabled={isDisabled}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      currentMerchant === merchant.name
                        ? 'bg-brand-primary/10 text-brand-primary font-medium'
                        : isDisabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {merchant.name}
                  </button>
                </div>
              )
            })}
            {processedMerchants.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                未找到匹配的商家
              </div>
            )}
          </div>
        </div>
      )}

      {/* 下拉菜单 - 排序 */}
      {activeDropdown === 'sort' && (
        <div className="absolute left-0 right-0 top-full bg-white border-t border-gray-200 shadow-lg z-50">
          <div className="p-1.5">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => updateParams('sortBy', option.value)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  currentSortBy === option.value || (!currentSortBy && option.value === 'published_at')
                    ? 'bg-brand-primary/10 text-brand-primary font-medium'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 遮罩层 */}
      {activeDropdown && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={closeDropdown}
        />
      )}
    </div>
  )
}
