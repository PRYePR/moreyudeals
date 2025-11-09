'use client'

import { ReactNode, useRef, useState, TouchEvent } from 'react'
import { RefreshCw } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const touchStartY = useRef(0)
  const isPulling = useRef(false)

  const threshold = 80 // 触发刷新的阈值（像素）

  const handleTouchStart = (e: TouchEvent) => {
    // 只有在页面顶部时才允许下拉刷新
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY
      isPulling.current = true
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isPulling.current || isRefreshing) return

    const currentY = e.touches[0].clientY
    const distance = currentY - touchStartY.current

    // 只在向下拉时生效
    if (distance > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(distance, threshold * 1.5))
      // 阻止页面滚动
      if (distance > 10) {
        e.preventDefault()
      }
    }
  }

  const handleTouchEnd = async () => {
    if (!isPulling.current || isRefreshing) return

    isPulling.current = false

    if (pullDistance >= threshold) {
      // 触发刷新
      setIsRefreshing(true)
      setPullDistance(threshold)

      try {
        await onRefresh()
        // 刷新成功，显示提示
        setShowSuccessToast(true)
        setTimeout(() => {
          setShowSuccessToast(false)
        }, 1500)
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      // 未达到阈值，回弹
      setPullDistance(0)
    }
  }

  const progress = Math.min((pullDistance / threshold) * 100, 100)

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* 刷新成功提示 Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">刷新成功</span>
          </div>
        </div>
      )}

      {/* 下拉刷新指示器 */}
      {pullDistance > 0 && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm transition-all duration-200"
          style={{
            height: `${pullDistance}px`,
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <div
              className={`transition-transform duration-200 ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              style={{
                transform: `rotate(${progress * 3.6}deg)`,
              }}
            >
              <RefreshCw
                className={`w-6 h-6 ${
                  pullDistance >= threshold ? 'text-brand-primary' : 'text-gray-400'
                }`}
              />
            </div>
            <p className="text-xs text-gray-600">
              {isRefreshing
                ? '正在刷新...'
                : pullDistance >= threshold
                ? '释放刷新'
                : '下拉刷新'}
            </p>
          </div>
        </div>
      )}

      {/* 主内容 */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
