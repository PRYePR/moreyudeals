'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createModuleLogger } from '@/lib/logger'

const logger = createModuleLogger('components:search-bar')

export default function SearchBar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsLoading(true)
    try {
      // 导航到搜索结果页面
      const encodedQuery = encodeURIComponent(searchQuery.trim())
      router.push(`/search?q=${encodedQuery}`)
    } catch (error) {
      logger.error('Search error', error as Error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('')
  }

  return (
    <div className="relative">
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索奥地利优惠信息... (支持中文/德文/英文)"
            className="search-input pr-24"
            disabled={isLoading}
          />

          {/* Clear Button */}
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-16 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Search Button */}
          <button
            type="submit"
            disabled={isLoading || !searchQuery.trim()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-3 py-1 rounded-md transition-colors duration-200 text-sm"
          >
            {isLoading ? (
              <div className="loading-spinner"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </button>
        </div>
      </form>

      {/* Search Suggestions (when typing) */}
      {searchQuery.length > 2 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-10">
          <div className="p-3">
            <div className="text-sm text-gray-500 mb-2">热门搜索建议:</div>
            <div className="space-y-1">
              {[
                'Samsung Galaxy',
                'Adidas Sneaker',
                'KitchenAid',
                'iPhone',
                'Nintendo Switch',
              ].filter(suggestion =>
                suggestion.toLowerCase().includes(searchQuery.toLowerCase())
              ).slice(0, 3).map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSearchQuery(suggestion)}
                  className="block w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm transition-colors"
                >
                  <span className="text-gray-400 mr-2">🔍</span>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}