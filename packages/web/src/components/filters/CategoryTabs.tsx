'use client'

import { useRouter, useSearchParams } from 'next/navigation'
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

interface CategoryTabsProps {
  categories: Category[]
  currentCategory?: string | null
  currentMerchant?: string | null
  categoryByMerchant?: Record<string, Record<string, number>>
}

// 分类图标映射（14个标准分类）
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  // 标准分类 ID
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

  // 兼容旧格式
  'home & kitchen': <Home className="w-4 h-4" />,
  'home and kitchen': <Home className="w-4 h-4" />,
  'beauty & health': <Heart className="w-4 h-4" />,
  'beauty and health': <Heart className="w-4 h-4" />,
  'food & drinks': <Utensils className="w-4 h-4" />,
  'food and drinks': <Utensils className="w-4 h-4" />,
  'sports & outdoor': <Bike className="w-4 h-4" />,
  'sports and outdoor': <Bike className="w-4 h-4" />,
}

export default function CategoryTabs({
  categories,
  currentCategory,
  currentMerchant,
  categoryByMerchant = {}
}: CategoryTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleCategoryClick = (categoryId: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (categoryId === 'all') {
      params.delete('category')
    } else {
      params.set('category', categoryId)
    }

    // 清除页码参数
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
    // 如果选中了商家，只显示该商家有商品的分类，并按数量排序
    const merchantCategories = categoryByMerchant[currentMerchant]
    displayCategories = categories
      .filter(cat => {
        // 检查该商家在这个分类下是否有商品
        return merchantCategories[cat.id] && merchantCategories[cat.id] > 0
      })
      .sort((a, b) => {
        // 按照该商家在这个分类下的商品数量降序排列
        const countA = merchantCategories[a.id] || 0
        const countB = merchantCategories[b.id] || 0
        return countB - countA
      })
  } else {
    // 没有选中商家时，先按总数量降序排列，再显示前14个
    displayCategories = [...categories]
      .sort((a, b) => b.count - a.count)
      .slice(0, 14)
  }

  const allDisplayCategories = [allCategory, ...displayCategories]
  const normalizedCurrent = currentCategory?.toLowerCase()

  return (
    <div className="relative">
      {/* 多行网格布局 - 响应式显示 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2">
        {allDisplayCategories.map((category) => {
          const isActive = category.id === 'all'
            ? !normalizedCurrent
            : normalizedCurrent === category.id

          return (
            <button
              key={category.id}
              type="button"
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
    </div>
  )
}
