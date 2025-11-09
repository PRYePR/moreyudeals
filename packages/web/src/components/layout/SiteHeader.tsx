'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search,
  Menu,
  X,
  ChevronDown,
  Tag,
  Store,
  Gamepad2,
  Laptop,
  Shirt,
  Home,
  Bike,
  Heart,
  Car,
  Utensils,
  Baby,
  Book,
  PawPrint,
  Briefcase,
  Leaf
} from 'lucide-react'
import { TranslationControl } from '@/components/TranslatableContent'

interface Category {
  id: string
  name: string
  translatedName: string
  count: number
}

interface SiteHeaderProps {
  merchants?: Array<{ name: string; count: number }>
  categories?: Category[]
}

export default function SiteHeader({ merchants: allMerchants = [], categories: allCategories = [] }: SiteHeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [merchantsOpen, setMerchantsOpen] = useState(false)

  // 分类图标映射
  const categoryIcons: Record<string, any> = {
    'gaming': Gamepad2,
    'electronics': Laptop,
    'fashion': Shirt,
    'home-kitchen': Home,
    'sports-outdoor': Bike,
    'beauty-health': Heart,
    'automotive': Car,
    'food-drinks': Utensils,
    'toys-kids': Baby,
    'books-media': Book,
    'pets': PawPrint,
    'office': Briefcase,
    'garden': Leaf,
    'general': Tag,
  }

  // 按商品数量排序分类
  const sortedCategories = [...allCategories]
    .sort((a, b) => b.count - a.count)
    .map(cat => ({
      id: cat.id,
      name: cat.name,
      label: cat.translatedName,
      Icon: categoryIcons[cat.id] || Tag
    }))

  // 热门分类（前6个）
  const popularCategories = sortedCategories.slice(0, 6)

  // 更多分类（剩余的）
  const moreCategories = sortedCategories.slice(6)

  // 热门商家（取前8个，按优惠数量排序）
  const merchants = allMerchants
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('search', searchQuery.trim())
      params.delete('page') // 重置分页

      const queryString = params.toString()
      router.push(queryString ? `/?${queryString}` : '/')
      setSearchQuery('')
      setMobileMenuOpen(false)
    }
  }

  const handleCategoryClick = (categoryId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('category', categoryId)
    params.delete('page') // 重置分页

    const queryString = params.toString()
    router.push(queryString ? `/?${queryString}` : '/')
    setCategoriesOpen(false)
    setMobileMenuOpen(false)
  }

  const handleMerchantClick = (merchantName: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('merchant', merchantName)
    params.delete('page') // 重置分页

    const queryString = params.toString()
    router.push(queryString ? `/?${queryString}` : '/')
    setMerchantsOpen(false)
    setMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 主导航栏 */}
        <div className="flex items-center justify-between h-16">
          {/* Logo + 网站名 */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-hover rounded-lg flex items-center justify-center text-white font-bold text-xl group-hover:scale-105 transition-transform">
                M
              </div>
              {/* 移动端和桌面端都显示文字 */}
              <div>
                <div className="text-lg font-bold text-gray-900 group-hover:text-brand-primary transition-colors">
                  墨鱼折扣
                </div>
                <div className="text-xs text-gray-500 -mt-1 hidden sm:block">奥地利优惠聚合</div>
              </div>
            </Link>
          </div>

          {/* 桌面端导航 */}
          <nav className="hidden lg:flex items-center gap-2">
            {/* 分类下拉 */}
            <div
              className="relative"
              onMouseLeave={() => setCategoriesOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setCategoriesOpen(!categoriesOpen)
                  setMerchantsOpen(false)
                }}
                onMouseEnter={() => {
                  setCategoriesOpen(true)
                  setMerchantsOpen(false)
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100 hover:text-brand-primary transition-colors min-w-[100px] justify-center"
              >
                <Tag className="w-4 h-4 flex-shrink-0" />
                <span>分类</span>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${categoriesOpen ? 'rotate-180' : ''}`} />
              </button>

              {categoriesOpen && (
                <div
                  className="absolute top-full left-0 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2"
                >
                  {/* 热门分类 */}
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    热门分类
                  </div>
                  {popularCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategoryClick(category.id)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors group"
                    >
                      <category.Icon className="w-4 h-4 text-gray-600 group-hover:text-brand-primary transition-colors" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-brand-primary">
                          {category.label}
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* 分隔线 */}
                  <div className="my-2 border-t border-gray-200" />

                  {/* 更多分类 */}
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    更多分类
                  </div>
                  {moreCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategoryClick(category.id)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors group"
                    >
                      <category.Icon className="w-4 h-4 text-gray-600 group-hover:text-brand-primary transition-colors" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-brand-primary">
                          {category.label}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 商家下拉 */}
            <div
              className="relative"
              onMouseLeave={() => setMerchantsOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setMerchantsOpen(!merchantsOpen)
                  setCategoriesOpen(false)
                }}
                onMouseEnter={() => {
                  setMerchantsOpen(true)
                  setCategoriesOpen(false)
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100 hover:text-brand-primary transition-colors min-w-[100px] justify-center"
              >
                <Store className="w-4 h-4 flex-shrink-0" />
                <span>商家</span>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${merchantsOpen ? 'rotate-180' : ''}`} />
              </button>

              {merchantsOpen && (
                <div
                  className="absolute top-full left-0 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2"
                >
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    热门商家
                  </div>
                  {merchants.map((merchant) => (
                    <button
                      key={merchant.name}
                      type="button"
                      onClick={() => handleMerchantClick(merchant.name)}
                      className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50 transition-colors group"
                    >
                      <div className="text-sm font-medium text-gray-900 group-hover:text-brand-primary">
                        {merchant.name}
                      </div>
                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {merchant.count}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* 搜索框 */}
          <div className="hidden md:block flex-1 max-w-md mx-6">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索优惠信息..."
                className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-brand-primary hover:bg-brand-hover text-white transition-colors"
                title="搜索"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* 语言切换按钮 - 桌面端 */}
          <div className="hidden md:block">
            <TranslationControl />
          </div>

          {/* 移动端菜单按钮 */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="菜单"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* 移动端搜索框和语言切换 */}
        <div className="md:hidden pb-3 space-y-3">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索优惠信息..."
              className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-brand-primary hover:bg-brand-hover text-white transition-colors"
              title="搜索"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* 语言切换按钮 - 移动端 */}
          <div className="flex justify-center">
            <TranslationControl />
          </div>
        </div>
      </div>

      {/* 移动端菜单 */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {/* 分类 */}
            <div>
              <button
                type="button"
                onClick={() => setCategoriesOpen(!categoriesOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Tag className="w-5 h-5" />
                  <span>分类</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${categoriesOpen ? 'rotate-180' : ''}`} />
              </button>
              {categoriesOpen && (
                <div className="mt-1 ml-4 space-y-1">
                  {/* 热门分类 */}
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    热门分类
                  </div>
                  {popularCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategoryClick(category.id)}
                      className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left hover:bg-gray-50 transition-colors"
                    >
                      <category.Icon className="w-4 h-4 text-gray-600" />
                      <div className="text-sm font-medium text-gray-900">{category.label}</div>
                    </button>
                  ))}

                  {/* 分隔线 */}
                  <div className="my-2 border-t border-gray-200" />

                  {/* 更多分类 */}
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    更多分类
                  </div>
                  {moreCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategoryClick(category.id)}
                      className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left hover:bg-gray-50 transition-colors"
                    >
                      <category.Icon className="w-4 h-4 text-gray-600" />
                      <div className="text-sm font-medium text-gray-900">{category.label}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 商家 */}
            <div>
              <button
                type="button"
                onClick={() => setMerchantsOpen(!merchantsOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Store className="w-5 h-5" />
                  <span>商家</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${merchantsOpen ? 'rotate-180' : ''}`} />
              </button>
              {merchantsOpen && (
                <div className="mt-1 ml-4 space-y-1">
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    热门商家
                  </div>
                  {merchants.map((merchant) => (
                    <button
                      key={merchant.name}
                      type="button"
                      onClick={() => handleMerchantClick(merchant.name)}
                      className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-900">{merchant.name}</div>
                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {merchant.count}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
