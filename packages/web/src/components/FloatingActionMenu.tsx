'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowUp, RefreshCw, MoreVertical, X, Filter, Search } from 'lucide-react'
import { useTranslation } from './TranslatableContent'
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

interface FloatingActionMenuProps {
  showBackToTop: boolean
  categories?: Category[]
  merchants?: Merchant[]
  currentCategory?: string | null
  currentMerchant?: string | null
  merchantByCategory?: Record<string, Record<string, number>>
  categoryByMerchant?: Record<string, Record<string, number>>
  filteredMerchants?: Merchant[]
  availableCategories?: Array<{ id: string; count: number }>
}

export default function FloatingActionMenu({
  showBackToTop,
  categories = [],
  merchants = [],
  currentCategory,
  currentMerchant,
  merchantByCategory,
  categoryByMerchant,
  filteredMerchants,
  availableCategories
}: FloatingActionMenuProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showOriginal, toggleTranslation } = useTranslation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [merchantSearchTerm, setMerchantSearchTerm] = useState('')
  const filterRef = useRef<HTMLDivElement>(null)

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      router.refresh()
      await new Promise(resolve => setTimeout(resolve, 800))
    } finally {
      setIsRefreshing(false)
    }
  }

  // 关闭筛选面板
  const closeFilter = () => {
    setIsFilterOpen(false)
    setMerchantSearchTerm('')
  }

  // 点击外部关闭筛选
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        closeFilter()
      }
    }

    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isFilterOpen])

  // 更新 URL 参数
  const updateParams = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    router.push(`/?${params.toString()}`)
    closeFilter()
  }

  // 获取当前搜索条件
  const currentSearch = searchParams.get('search')

  // 处理分类联动
  const processedCategories = (() => {
    let categoriesList = [...categories]

    // 根据商家筛选
    if (currentMerchant && categoryByMerchant && categoryByMerchant[currentMerchant]) {
      const merchantCategories = categoryByMerchant[currentMerchant]
      categoriesList = categoriesList.filter(cat =>
        merchantCategories[cat.id] && merchantCategories[cat.id] > 0
      )
    }

    // 如果有搜索条件，进一步过滤
    if (currentSearch && availableCategories && availableCategories.length > 0) {
      const availableIds = new Set(availableCategories.map(c => c.id))
      categoriesList = categoriesList.filter(cat => availableIds.has(cat.id))
    }

    return categoriesList
  })()

  // 处理商家联动和混合排序
  const processedMerchants = (() => {
    let merchantsList = [...merchants].map(m => ({ ...m, available: true }))

    // 根据分类筛选
    if (currentCategory && currentCategory !== 'all' && merchantByCategory && merchantByCategory[currentCategory]) {
      const categoryMerchants = merchantByCategory[currentCategory]
      merchantsList = merchantsList.map(m => ({
        ...m,
        available: m.available && Boolean(categoryMerchants[m.name] && categoryMerchants[m.name] > 0)
      }))
    }

    // 根据搜索进一步筛选
    if (currentSearch && filteredMerchants && filteredMerchants.length > 0) {
      const searchMerchantMap = new Map(filteredMerchants.map(m => [m.name, m.available !== false]))
      merchantsList = merchantsList.map(m => ({
        ...m,
        available: m.available && (searchMerchantMap.get(m.name) !== false)
      }))
    }

    // 根据商家名称搜索过滤
    if (merchantSearchTerm) {
      merchantsList = merchantsList.filter(m =>
        m.name.toLowerCase().includes(merchantSearchTerm.toLowerCase())
      )
    }

    // 混合排序
    const availableMerchants = merchantsList.filter(m => m.available !== false).sort((a, b) => b.count - a.count)
    const unavailableMerchants = merchantsList.filter(m => m.available === false).sort((a, b) => b.count - a.count)

    return [...availableMerchants, ...unavailableMerchants]
  })()

  return (
    <>
      {/* 筛选面板 - 全屏弹窗 (仅移动端) */}
      {isFilterOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white overflow-y-auto" ref={filterRef}>
          {/* 头部 */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">筛选</h2>
            <button
              onClick={closeFilter}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-4 space-y-6">
            {/* 分类筛选 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">分类</h3>
              <div className="space-y-1.5">
                <button
                  onClick={() => updateParams('category', 'all')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    !currentCategory || currentCategory === 'all'
                      ? 'bg-orange-500/10 text-orange-500 font-medium'
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
                        ? 'bg-orange-500/10 text-orange-500 font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {category.translatedName}
                  </button>
                ))}
              </div>
            </div>

            {/* 商家筛选 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">商家</h3>

              {/* 搜索框 */}
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索商家..."
                    value={merchantSearchTerm}
                    onChange={(e) => setMerchantSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                <button
                  onClick={() => updateParams('merchant', null)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    !currentMerchant
                      ? 'bg-orange-500/10 text-orange-500 font-medium'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  全部商家
                </button>
                {processedMerchants.map((merchant, index) => {
                  const isDisabled = merchant.available === false
                  const isFirstDisabled = isDisabled && (index === 0 || processedMerchants[index - 1]?.available !== false)

                  return (
                    <div key={merchant.name}>
                      {isFirstDisabled && (
                        <div className="my-2 border-t border-gray-200" />
                      )}
                      <button
                        onClick={() => !isDisabled && updateParams('merchant', merchant.name)}
                        disabled={isDisabled}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          currentMerchant === merchant.name
                            ? 'bg-orange-500/10 text-orange-500 font-medium'
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
          </div>
        </div>
      )}

      {/* 弹出式子菜单 - 绝对定位在主按钮上方 (缩小尺寸) */}
      {isMenuOpen && (
        <div className="fixed bottom-[110px] right-4 z-50 flex flex-col-reverse gap-2 items-end animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* 筛选按钮 (仅移动端) */}
          <button
            onClick={() => {
              setIsFilterOpen(true)
              setIsMenuOpen(false)
            }}
            className="lg:hidden bg-orange-500 hover:bg-orange-600 text-white w-9 h-9 rounded-full shadow-md transition-all duration-200 hover:scale-110 flex items-center justify-center"
            title="筛选"
          >
            <Filter className="w-4 h-4" />
          </button>

          {/* 刷新按钮 */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-orange-500 hover:bg-orange-600 text-white w-9 h-9 rounded-full shadow-md transition-all duration-200 hover:scale-110 disabled:opacity-50 flex items-center justify-center"
            title="刷新"
          >
            <RefreshCw className={`w-4 h-4 transition-colors ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* 翻译按钮 */}
          <button
            onClick={toggleTranslation}
            className="bg-orange-500 hover:bg-orange-600 w-9 h-9 rounded-full shadow-md transition-all duration-200 hover:scale-110 flex items-center justify-center active:scale-95"
            title={showOriginal ? '切换到中文' : '切换到德语'}
          >
            <span className="text-white font-bold text-xs">
              {showOriginal ? 'DE' : '中'}
            </span>
          </button>
        </div>
      )}

      {/* 主按钮（展开/收起菜单）- 固定位置，始终显示 (缩小尺寸) */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={`fixed bottom-[64px] right-4 z-50 w-10 h-10 rounded-full shadow-lg transition-all duration-200 hover:scale-110 flex items-center justify-center ${
          isMenuOpen
            ? 'bg-orange-500 hover:bg-orange-600 text-white'
            : 'bg-orange-500 hover:bg-orange-600 text-white'
        }`}
        title={isMenuOpen ? '收起菜单' : '展开菜单'}
      >
        {isMenuOpen ? (
          <X className="w-4 h-4" />
        ) : (
          <MoreVertical className="w-4 h-4" />
        )}
      </button>

      {/* 返回顶部按钮（滚动后才显示）- 固定在底部 (缩小尺寸) */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-4 right-4 z-50 bg-orange-500 hover:bg-orange-600 text-white w-10 h-10 rounded-full shadow-lg transition-all duration-200 hover:scale-110 flex items-center justify-center animate-in fade-in slide-in-from-bottom-2"
          title="返回顶部"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </>
  )
}
