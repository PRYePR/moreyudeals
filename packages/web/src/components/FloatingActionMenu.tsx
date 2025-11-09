'use client'

import { useState } from 'react'
import { ArrowUp, RefreshCw, MoreVertical, X } from 'lucide-react'
import { useTranslation } from './TranslatableContent'
import { useRouter } from 'next/navigation'

interface FloatingActionMenuProps {
  showBackToTop: boolean
}

export default function FloatingActionMenu({ showBackToTop }: FloatingActionMenuProps) {
  const router = useRouter()
  const { showOriginal, toggleTranslation } = useTranslation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

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

  return (
    <>
      {/* 弹出式子菜单 - 绝对定位在主按钮上方 */}
      {isMenuOpen && (
        <div className="fixed bottom-[144px] right-6 z-50 flex flex-col-reverse gap-3 items-end animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* 刷新按钮 */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-white hover:bg-orange-50 text-gray-700 w-11 h-11 rounded-full shadow-md transition-all duration-200 hover:scale-110 disabled:opacity-50 border-2 border-orange-500 flex items-center justify-center group"
            title="刷新"
          >
            <RefreshCw className={`w-5 h-5 text-orange-500 transition-colors ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* 翻译按钮 - 方案E：动态显示当前语言 */}
          <button
            onClick={toggleTranslation}
            className="bg-white hover:bg-orange-50 w-11 h-11 rounded-full shadow-md transition-all duration-200 hover:scale-110 border-2 border-orange-500 flex items-center justify-center active:scale-95"
            title={showOriginal ? '切换到中文' : '切换到德语'}
          >
            <span className="text-orange-500 font-bold text-sm">
              {showOriginal ? 'DE' : '中'}
            </span>
          </button>
        </div>
      )}

      {/* 主按钮（展开/收起菜单）- 固定位置，始终显示 */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={`fixed bottom-[84px] right-6 z-50 w-12 h-12 rounded-full shadow-lg transition-all duration-200 hover:scale-110 flex items-center justify-center ${
          isMenuOpen
            ? 'bg-orange-500 hover:bg-orange-600 text-white'
            : 'bg-white hover:bg-orange-50 text-gray-700 border-2 border-orange-500'
        }`}
        title={isMenuOpen ? '收起菜单' : '展开菜单'}
      >
        {isMenuOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <MoreVertical className="w-5 h-5 text-orange-500" />
        )}
      </button>

      {/* 返回顶部按钮（滚动后才显示）- 固定在底部 */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 bg-orange-500 hover:bg-orange-600 text-white w-12 h-12 rounded-full shadow-lg transition-all duration-200 hover:scale-110 flex items-center justify-center animate-in fade-in slide-in-from-bottom-2"
          title="返回顶部"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </>
  )
}
