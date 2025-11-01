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

export default function CategoryTabs({ categories, currentCategory }: CategoryTabsProps) {
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

  // 只显示有优惠的分类（数量 > 0）
  const categoriesWithDeals = categories.filter(cat => cat.count > 0)
  const displayCategories = [allCategory, ...categoriesWithDeals.slice(0, 13)] // 最多显示13个分类 + 全部
  const normalizedCurrent = currentCategory?.toLowerCase()

  return (
    <div className="relative">
      {/* 横向滚动容器 */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 pb-2">
          {displayCategories.map((category) => {
            const isActive = category.id === 'all'
              ? !normalizedCurrent
              : normalizedCurrent === category.id

            return (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-lg
                  border whitespace-nowrap transition-all duration-200
                  ${isActive
                    ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-brand-primary hover:text-brand-primary'
                  }
                `}
              >
                {CATEGORY_ICONS[category.id] || category.icon}
                <span className="font-medium text-sm">
                  {category.translatedName}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  {category.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 隐藏滚动条的 CSS */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
