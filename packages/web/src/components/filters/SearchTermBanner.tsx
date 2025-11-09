'use client'

import { X, Search } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

interface SearchTermBannerProps {
  searchTerm: string
}

export default function SearchTermBanner({ searchTerm }: SearchTermBannerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 如果没有搜索词，不显示
  if (!searchTerm) {
    return null
  }

  // 清除搜索条件
  const clearSearch = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('search')
    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-brand-primary flex-shrink-0" />
          <span className="text-base text-gray-700">搜索:</span>
          <span className="text-base font-semibold text-brand-primary">{searchTerm}</span>
          <button
            onClick={clearSearch}
            className="ml-auto p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="清除搜索"
          >
            <X className="w-4 h-4 text-gray-500 hover:text-gray-700" />
          </button>
        </div>
      </div>
    </div>
  )
}
