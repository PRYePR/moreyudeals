'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { TrendingUp, Store, Tag } from 'lucide-react'
import AdSlot from '../ads/AdSlot'

interface Category {
  id: string
  name: string
  translatedName: string
  count: number
}

interface RightSidebarProps {
  categories: Category[]
  merchants: Array<{ name: string; count: number }>
}

export default function RightSidebar({ categories, merchants }: RightSidebarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 热门分类 Top 5
  const topCategories = categories
    .filter(cat => cat.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // 热门商家 Top 5（目前简单展示，实际应该从数据中统计）
  const topMerchants = merchants.slice(0, 5)

  const handleCategoryClick = (categoryId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('category', categoryId)
    params.delete('page') // 重置分页

    const queryString = params.toString()
    router.push(queryString ? `/?${queryString}` : '/')
  }

  const handleMerchantClick = (merchant: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('merchant', merchant)
    params.delete('page') // 重置分页

    const queryString = params.toString()
    router.push(queryString ? `/?${queryString}` : '/')
  }

  return (
    <aside className="w-[280px] space-y-6 flex-shrink-0">
      {/* 热门分类卡片 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-brand-primary" />
          <h3 className="font-semibold text-gray-900">热门分类</h3>
        </div>
        <div className="space-y-2">
          {topCategories.map((category, index) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <span className="text-xs font-bold text-gray-400 w-4">
                {index + 1}
              </span>
              <Tag className="w-4 h-4 text-gray-400 group-hover:text-brand-primary transition-colors" />
              <span className="text-sm text-gray-700 group-hover:text-brand-primary transition-colors">
                {category.translatedName}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 热门商家卡片 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Store className="w-5 h-5 text-brand-primary" />
          <h3 className="font-semibold text-gray-900">热门商家</h3>
        </div>
        <div className="space-y-2">
          {topMerchants.map((merchant, index) => (
            <button
              key={merchant.name}
              onClick={() => handleMerchantClick(merchant.name)}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <span className="text-xs font-bold text-gray-400 w-4">
                {index + 1}
              </span>
              <span className="text-sm text-gray-700 group-hover:text-brand-primary transition-colors">
                {merchant.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 广告位占位 */}
      <AdSlot variant="default" />

      {/* Newsletter 订阅 */}
      <div className="bg-brand-primary rounded-lg p-4 text-white">
        <h3 className="font-semibold mb-2">订阅优惠提醒</h3>
        <p className="text-xs text-white/80 mb-3">
          及时获取最新优惠信息
        </p>
        <input
          type="email"
          placeholder="输入您的邮箱"
          className="w-full px-3 py-2 rounded-lg text-gray-900 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-white/50"
        />
        <button className="w-full bg-white text-brand-primary py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
          订阅
        </button>
      </div>

      {/* 站点说明 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-2">关于 Moreyudeals</h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          我们聚合奥地利各大电商平台的优惠信息，帮助您发现最划算的商品。
          每日更新，不错过任何好价！
        </p>
      </div>
    </aside>
  )
}
