'use client'

import Link from 'next/link'

interface DealsFiltersProps {
  categories: Array<{ name: string; count: number }>
  currentParams: {
    page?: string
    category?: string
    merchant?: string
    search?: string
    sortBy?: 'latest' | 'price_asc' | 'price_desc' | 'discount'
    minDiscount?: string
  }
}

export default function DealsFilters({ categories, currentParams }: DealsFiltersProps) {
  const handleFilterChange = (key: string, value: string) => {
    const url = new URL(window.location.href)
    if (value) {
      url.searchParams.set(key, value)
    } else {
      url.searchParams.delete(key)
    }
    url.searchParams.delete('page') // Reset to page 1
    window.location.href = url.toString()
  }

  const removeFilter = (key: string) => {
    const url = new URL(window.location.href)
    url.searchParams.delete(key)
    url.searchParams.delete('page')
    window.location.href = url.toString()
  }

  return (
    <div className="mb-6 bg-white rounded-lg shadow-sm p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Category Filter */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            分类
          </label>
          <select
            id="category"
            name="category"
            defaultValue={currentParams.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">所有分类</option>
            {categories.map((category) => (
              <option key={category.name} value={category.name}>
                {category.name} ({category.count})
              </option>
            ))}
          </select>
        </div>

        {/* Sort Filter */}
        <div>
          <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-2">
            排序方式
          </label>
          <select
            id="sortBy"
            name="sortBy"
            defaultValue={currentParams.sortBy || 'latest'}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="latest">最新发布</option>
            <option value="discount">折扣最高</option>
            <option value="price_asc">价格从低到高</option>
            <option value="price_desc">价格从高到低</option>
          </select>
        </div>

        {/* Min Discount Filter */}
        <div>
          <label htmlFor="minDiscount" className="block text-sm font-medium text-gray-700 mb-2">
            最低折扣
          </label>
          <select
            id="minDiscount"
            name="minDiscount"
            defaultValue={currentParams.minDiscount || ''}
            onChange={(e) => handleFilterChange('minDiscount', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">不限</option>
            <option value="10">10% 及以上</option>
            <option value="20">20% 及以上</option>
            <option value="30">30% 及以上</option>
            <option value="50">50% 及以上</option>
            <option value="70">70% 及以上</option>
          </select>
        </div>

        {/* Search */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            搜索
          </label>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const search = formData.get('search') as string
              handleFilterChange('search', search)
            }}
          >
            <input
              type="text"
              id="search"
              name="search"
              defaultValue={currentParams.search || ''}
              placeholder="搜索优惠..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </form>
        </div>
      </div>

      {/* Active Filters Display */}
      {(currentParams.category || currentParams.sortBy !== 'latest' || currentParams.minDiscount || currentParams.search) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700">已选筛选：</span>
          {currentParams.category && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
              分类: {currentParams.category}
              <button
                onClick={() => removeFilter('category')}
                className="hover:text-primary-900"
              >
                ×
              </button>
            </span>
          )}
          {currentParams.minDiscount && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
              折扣 ≥ {currentParams.minDiscount}%
              <button
                onClick={() => removeFilter('minDiscount')}
                className="hover:text-primary-900"
              >
                ×
              </button>
            </span>
          )}
          {currentParams.search && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
              搜索: {currentParams.search}
              <button
                onClick={() => removeFilter('search')}
                className="hover:text-primary-900"
              >
                ×
              </button>
            </span>
          )}
          <Link
            href="/deals"
            className="text-sm text-primary-600 hover:text-primary-700 underline"
          >
            清除所有
          </Link>
        </div>
      )}
    </div>
  )
}
