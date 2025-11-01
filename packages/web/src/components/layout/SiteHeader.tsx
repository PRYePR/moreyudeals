'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Menu, X } from 'lucide-react'

interface SiteHeaderProps {
  onSearch?: (query: string) => void
}

export default function SiteHeader({ onSearch }: SiteHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim())
    }
  }

  const categories = [
    { name: '全部', slug: 'all' },
    { name: '电子产品', slug: 'electronics' },
    { name: '时尚服饰', slug: 'fashion' },
    { name: '家居用品', slug: 'home' },
    { name: '运动户外', slug: 'sports' },
    { name: '美妆护肤', slug: 'beauty' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Moreyu v3.1 配色 */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-hover rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <span className="hidden sm:block font-bold text-xl text-brand-primary">
              Moreyudeals
            </span>
          </Link>

          {/* Desktop Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索商品、商店或标签..."
                className="w-full px-4 py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </form>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {categories.slice(0, 4).map((category) => (
              <Link
                key={category.slug}
                href={`/categories/${category.slug}`}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-brand-primary hover:bg-brand-light rounded-lg transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Mobile Search */}
        <form onSubmit={handleSearch} className="md:hidden pb-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索商品、商店或标签..."
              className="w-full px-4 py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </form>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-3 space-y-1">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/categories/${category.slug}`}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-gray-700 hover:text-brand-primary hover:bg-brand-light rounded-lg transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
