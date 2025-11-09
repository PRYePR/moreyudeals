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
  const touchStartX = useRef(0)
  const isPulling = useRef(false)

  const threshold = 80 // 触发刷新的阈值（像素）
  const maxDistance = 120 // 最大下拉距离

  /**
   * 检测是否在页面顶部（双重检测更可靠）
   */
  const isAtTop = (): boolean => {
    return window.scrollY <= 0 && document.documentElement.scrollTop <= 0
  }

  /**
   * 检测是否为垂直滑动（避免水平滑动误触）
   * 水平移动距离小于 10px 认为是垂直滑动
   */
  const isVerticalSwipe = (currentX: number): boolean => {
    const horizontalDistance = Math.abs(currentX - touchStartX.current)
    return horizontalDistance < 10
  }

  /**
   * 应用阻尼效果（下拉距离越大，阻力越大）
   */
  const applyDamping = (distance: number): number => {
    if (distance <= 0) return 0

    // 超过 100px 后应用阻尼系数
    if (distance > 100) {
      const extra = distance - 100
      return 100 + extra * 0.5
    }
    return distance
  }

  const handleTouchStart = (e: TouchEvent) => {
    // 只有在页面顶部且不在刷新中时才允许下拉刷新
    if (isAtTop() && !isRefreshing) {
      touchStartY.current = e.touches[0].clientY
      touchStartX.current = e.touches[0].clientX
      isPulling.current = true
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isPulling.current || isRefreshing) return

    const currentY = e.touches[0].clientY
    const currentX = e.touches[0].clientX
    const distance = currentY - touchStartY.current

    // 只在向下拉且为垂直滑动时生效
    if (distance > 0 && isAtTop() && isVerticalSwipe(currentX)) {
      // 应用阻尼效果
      const dampedDistance = applyDamping(distance)
      setPullDistance(Math.min(dampedDistance, maxDistance))

      // 关键：选择性阻止默认行为
      // 只在确实向下拉动时阻止（避免阻止 click 事件）
      if (distance > 5) {
        e.preventDefault()
        e.stopPropagation()
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

        // 刷新成功，显示 Toast 提示
        setShowSuccessToast(true)
        setTimeout(() => {
          setShowSuccessToast(false)
        }, 1500)
      } catch (error) {
        console.error('刷新失败:', error)
      } finally {
        // 延迟一点再重置，让动画更流畅
        setTimeout(() => {
          setIsRefreshing(false)
          setPullDistance(0)
        }, 300)
      }
    } else {
      // 未达到阈值，回弹
      setPullDistance(0)
    }
  }

  // 计算进度百分比
  const progress = Math.min((pullDistance / threshold) * 100, 100)

  // 判断是否达到释放阈值
  const canRelease = pullDistance >= threshold

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* 刷新成功提示 Toast */}
      {showSuccessToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">已刷新</span>
          </div>
        </div>
      )}

      {/* 下拉刷新指示器 */}
      {pullDistance > 0 && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-gradient-to-b from-white/95 via-white/90 to-transparent backdrop-blur-sm transition-all duration-200"
          style={{
            height: `${Math.min(pullDistance + 20, 140)}px`,
          }}
        >
          <div className="flex flex-col items-center gap-2 pt-4">
            {/* 刷新图标 */}
            <div
              className={`transition-all duration-200 ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              style={{
                transform: isRefreshing ? 'rotate(0deg)' : `rotate(${progress * 3.6}deg)`,
              }}
            >
              <RefreshCw
                className={`w-6 h-6 transition-colors duration-200 ${
                  canRelease ? 'text-green-500' : 'text-gray-400'
                }`}
              />
            </div>

            {/* 状态文字 */}
            <p className={`text-xs font-medium transition-colors duration-200 ${
              canRelease ? 'text-green-600' : 'text-gray-500'
            }`}>
              {isRefreshing
                ? '正在刷新...'
                : canRelease
                ? '松手刷新'
                : '下拉刷新'}
            </p>

            {/* 进度指示器 */}
            {!isRefreshing && (
              <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    canRelease ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 主内容 */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
