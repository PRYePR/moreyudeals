'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  Gamepad2,
  Laptop,
  Home,
  Heart,
  Utensils,
  Car,
  Tag,
  Shirt,
  Bike,
  Baby,
  Book,
  PawPrint,
  Briefcase,
  Leaf
} from 'lucide-react'

interface Category {
  id: string
  name: string
  translatedName: string
  count: number
  icon?: React.ReactNode
}

interface CategoryTabsCollapsibleProps {
  categories: Category[]
  currentCategory?: string | null
  currentMerchant?: string | null
  categoryByMerchant?: Record<string, Record<string, number>>
}

// 分类图标映射
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'gaming': <Gamepad2 className="w-4 h-4" />,
  'electronics': <Laptop className="w-4 h-4" />,
  'fashion': <Shirt className="w-4 h-4" />,
  'home-kitchen': <Home className="w-4 h-4" />,
  'sports-outdoor': <Bike className="w-4 h-4" />,
  'beauty-health': <Heart className="w-4 h-4" />,
  'automotive': <Car className="w-4 h-4" />,
  'food-drinks': <Utensils className="w-4 h-4" />,
  'toys-kids': <Baby className="w-4 h-4" />,
  'books-media': <Book className="w-4 h-4" />,
  'pets': <PawPrint className="w-4 h-4" />,
  'office': <Briefcase className="w-4 h-4" />,
  'garden': <Leaf className="w-4 h-4" />,
  'general': <Tag className="w-4 h-4" />,
  'home & kitchen': <Home className="w-4 h-4" />,
  'home and kitchen': <Home className="w-4 h-4" />,
  'beauty & health': <Heart className="w-4 h-4" />,
  'beauty and health': <Heart className="w-4 h-4" />,
  'food & drinks': <Utensils className="w-4 h-4" />,
  'food and drinks': <Utensils className="w-4 h-4" />,
  'sports & outdoor': <Bike className="w-4 h-4" />,
  'sports and outdoor': <Bike className="w-4 h-4" />,
}

export default function CategoryTabsCollapsible({
  categories,
  currentCategory,
  currentMerchant,
  categoryByMerchant = {}
}: CategoryTabsCollapsibleProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleCategoryClick = (categoryId: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (categoryId === 'all') {
      params.delete('category')
    } else {
      params.set('category', categoryId)
    }

    params.delete('page')

    const queryString = params.toString()
    router.push(queryString ? `/?${queryString}` : '/')
  }

  const allCategory = {
    id: 'all',
    name: 'All',
    translatedName: '全部',
    count: categories.reduce((sum, cat) => sum + cat.count, 0),
    icon: <Tag className="w-4 h-4" />
  }

  // 根据当前选中的商家动态过滤分类
  let displayCategories: typeof categories
  if (currentMerchant && categoryByMerchant[currentMerchant]) {
    const merchantCategories = categoryByMerchant[currentMerchant]
    displayCategories = categories.filter(cat => {
      return merchantCategories[cat.id] && merchantCategories[cat.id] > 0
    })
  } else {
    displayCategories = categories.slice(0, 14)
  }

  const allDisplayCategories = [allCategory, ...displayCategories]
  const normalizedCurrent = currentCategory?.toLowerCase()

  // 移动端：显示前6个 + "更多"按钮
  // 桌面端：显示全部
  const MOBILE_DISPLAY_COUNT = 6
  const visibleCategories = isExpanded
    ? allDisplayCategories
    : allDisplayCategories.slice(0, MOBILE_DISPLAY_COUNT)

  const hasMore = allDisplayCategories.length > MOBILE_DISPLAY_COUNT

  return (
    <div className="relative space-y-2">
      {/* 主要分类网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2">
        {visibleCategories.map((category) => {
          const isActive = category.id === 'all'
            ? !normalizedCurrent
            : normalizedCurrent === category.id

          return (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={`
                flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg
                border transition-all duration-200 min-w-0
                ${isActive
                  ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-brand-primary hover:text-brand-primary hover:shadow-sm'
                }
              `}
            >
              <span className="flex-shrink-0">
                {CATEGORY_ICONS[category.id] || category.icon}
              </span>
              <span className="font-medium text-sm truncate">
                {category.translatedName}
              </span>
            </button>
          )
        })}
      </div>

      {/* 展开/收起按钮 (仅在移动端且有更多分类时显示) */}
      {hasMore && (
        <div className="flex justify-center md:hidden">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-primary hover:text-brand-primary-dark transition-colors"
          >
            <span>
              {isExpanded
                ? `收起 (${allDisplayCategories.length - MOBILE_DISPLAY_COUNT} 个分类)`
                : `显示更多 (${allDisplayCategories.length - MOBILE_DISPLAY_COUNT} 个分类)`
              }
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
    </div>
  )
}
