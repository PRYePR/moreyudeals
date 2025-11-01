'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Menu, X, ChevronDown, Tag, Store } from 'lucide-react'

export default function SiteHeader() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [merchantsOpen, setMerchantsOpen] = useState(false)

  // 主要分类（基于实际数据库数据）
  const categories = [
    { name: 'Elektronik', label: '电子产品', icon: '📱' },
    { name: 'Haushalt', label: '家居用品', icon: '🏠' },
    { name: 'Fashion & Beauty', label: '时尚美妆', icon: '👗' },
    { name: 'Lebensmittel', label: '食品饮料', icon: '🍔' },
    { name: 'Spielzeug', label: '玩具游戏', icon: '🎮' },
    { name: 'Entertainment', label: '娱乐影音', icon: '🎬' },
    { name: 'Freizeit', label: '休闲运动', icon: '⚽' },
    { name: 'Werkzeug & Baumarkt', label: '工具建材', icon: '🔧' },
  ]

  // 热门商家（基于实际数据库数据）
  const merchants = [
    { name: 'Amazon', count: 44, icon: '🛒' },
    { name: 'MediaMarkt', count: 12, icon: '🔌' },
    { name: 'XXXLutz', count: 6, icon: '🛋️' },
    { name: 'Interspar', count: 4, icon: '🛍️' },
    { name: 'iBOOD', count: 3, icon: '💰' },
    { name: 'Möbelix', count: 2, icon: '🪑' },
    { name: 'tink', count: 2, icon: '💡' },
    { name: 'we-are.travel', count: 2, icon: '✈️' },
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setMobileMenuOpen(false)
    }
  }

  const handleCategoryClick = (categoryName: string) => {
    router.push(`/?category=${encodeURIComponent(categoryName)}`)
    setCategoriesOpen(false)
    setMobileMenuOpen(false)
  }

  const handleMerchantClick = (merchantName: string) => {
    router.push(`/?merchant=${encodeURIComponent(merchantName)}`)
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
              <div className="hidden sm:block">
                <div className="text-lg font-bold text-gray-900 group-hover:text-brand-primary transition-colors">
                  Moreyudeals
                </div>
                <div className="text-xs text-gray-500 -mt-1">奥地利优惠聚合</div>
              </div>
            </Link>
          </div>

          {/* 桌面端导航 */}
          <nav className="hidden lg:flex items-center gap-2">
            {/* 分类下拉 */}
            <div className="relative">
              <button
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
                  className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2"
                  onMouseLeave={() => setCategoriesOpen(false)}
                >
                  {categories.map((category) => (
                    <button
                      key={category.name}
                      onClick={() => handleCategoryClick(category.name)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors group"
                    >
                      <span className="text-xl">{category.icon}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-brand-primary">
                          {category.label}
                        </div>
                        <div className="text-xs text-gray-500">{category.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 商家下拉 */}
            <div className="relative">
              <button
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
                  className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2"
                  onMouseLeave={() => setMerchantsOpen(false)}
                >
                  {merchants.map((merchant) => (
                    <button
                      key={merchant.name}
                      onClick={() => handleMerchantClick(merchant.name)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors group"
                    >
                      <span className="text-xl">{merchant.icon}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-brand-primary">
                          {merchant.name}
                        </div>
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </form>
          </div>

          {/* 移动端菜单按钮 */}
          <button
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

        {/* 移动端搜索框 */}
        <div className="md:hidden pb-3">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索优惠信息..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </form>
        </div>
      </div>

      {/* 移动端菜单 */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {/* 分类 */}
            <div>
              <button
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
                  {categories.map((category) => (
                    <button
                      key={category.name}
                      onClick={() => handleCategoryClick(category.name)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-lg">{category.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{category.label}</div>
                        <div className="text-xs text-gray-500">{category.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 商家 */}
            <div>
              <button
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
                  {merchants.map((merchant) => (
                    <button
                      key={merchant.name}
                      onClick={() => handleMerchantClick(merchant.name)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-lg">{merchant.icon}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{merchant.name}</div>
                      </div>
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
