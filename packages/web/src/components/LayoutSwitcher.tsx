'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { LayoutGrid, List } from 'lucide-react'

export default function LayoutSwitcher() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 默认是瀑布流
  const currentLayout = searchParams.get('layout') || 'waterfall'

  const toggleLayout = () => {
    const params = new URLSearchParams(searchParams.toString())

    if (currentLayout === 'list') {
      // 从列表切换到瀑布流（默认），删除参数
      params.delete('layout')
    } else {
      // 从瀑布流切换到列表
      params.set('layout', 'list')
    }

    const queryString = params.toString()
    const currentPath = window.location.pathname
    router.push(queryString ? `${currentPath}?${queryString}` : currentPath)
  }

  return (
    <button
      onClick={toggleLayout}
      className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      title={currentLayout === 'list' ? '切换到瀑布流视图' : '切换到列表视图'}
    >
      {currentLayout === 'list' ? (
        <>
          <LayoutGrid className="w-4 h-4" />
          <span className="text-xs md:text-sm">瀑布流</span>
        </>
      ) : (
        <>
          <List className="w-4 h-4" />
          <span className="text-xs md:text-sm">列表</span>
        </>
      )}
    </button>
  )
}
