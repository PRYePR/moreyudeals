'use client'

import { useState } from 'react'
import Image from 'next/image'
import DealDetailContent from '@/components/DealDetailContent'
import {
  TranslationProvider,
  TranslationControl,
  TranslatableText,
  TranslatableDescription
} from '@/components/TranslatableContent'
import { ProductBadges } from '@/components/ProductBadges'
import { DetailContent } from '@/lib/detail-page-fetcher'
import {
  EnhancedCard,
  ImageGallery,
  StatsGrid,
  FloatingActionButton,
  Tooltip
} from '@/components/EnhancedDealLayout'

interface DealPageClientProps {
  deal: any
  dealId: string
}

export default function DealPageClient({ deal, dealId }: DealPageClientProps) {
  const [detailContent, setDetailContent] = useState<DetailContent | null>(null)

  const formatPrice = (price: string, currency: string) => {
    const number = parseFloat(price)
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
    }).format(number)
  }

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj)
  }

  const getDaysRemaining = (expiresAt: Date | string) => {
    const now = new Date()
    const expirationDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
    const diffTime = expirationDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysRemaining = getDaysRemaining(deal.expiresAt)

  return (
    <TranslationProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-sm shadow-sm border-b sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Tooltip content="返回主页查看更多优惠">
                <a
                  href="/"
                  className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200"
                >
                  <span>←</span>
                  <span>返回首页</span>
                </a>
              </Tooltip>
              <div className="flex items-center space-x-4">
                <TranslationControl />
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded-full">
                    来源: {deal.source}
                  </span>
                  <span>•</span>
                  <span>{formatDate(deal.publishedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Enhanced Image Gallery */}
            <div className="space-y-4">
              <EnhancedCard className="relative p-0 overflow-hidden">
                <ImageGallery
                  mainImage={deal.imageUrl}
                  images={detailContent?.images || []}
                  altText={deal.translatedTitle}
                />

                {/* Floating Badges */}
                {deal.discountPercentage && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className="bg-red-500 text-white px-3 py-1 rounded-full text-lg font-bold shadow-lg animate-pulse">
                      -{deal.discountPercentage}%
                    </div>
                  </div>
                )}

                <div className="absolute top-4 left-4 z-10">
                  <div className="bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                    {deal.category}
                  </div>
                </div>
              </EnhancedCard>

              {/* Price Alert */}
              {daysRemaining <= 7 && daysRemaining > 0 && (
                <EnhancedCard className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200 p-4 text-center">
                  <div className="text-red-600 font-semibold text-lg">
                    ⏰ 优惠即将结束
                  </div>
                  <div className="text-red-500 text-sm mt-1">
                    还剩 {daysRemaining} 天
                  </div>
                  <div className="mt-2 w-full bg-red-100 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.max(10, (daysRemaining / 30) * 100)}%` }}
                    />
                  </div>
                </EnhancedCard>
              )}

              {/* Quick Stats */}
              <StatsGrid
                stats={[
                  {
                    label: '节省',
                    value: `${deal.discountPercentage || 0}%`,
                    icon: '💰',
                    trend: 'up'
                  },
                  {
                    label: '评分',
                    value: '4.5',
                    icon: '⭐',
                    trend: 'up'
                  },
                  {
                    label: '剩余',
                    value: `${daysRemaining}天`,
                    icon: '⏳',
                    trend: daysRemaining > 7 ? 'neutral' : 'down'
                  },
                  {
                    label: '来源',
                    value: deal.source,
                    icon: '🏪'
                  }
                ]}
              />
            </div>

            {/* Right Column - Details */}
            <div className="space-y-6">
              {/* Title */}
              <EnhancedCard className="p-6" delay={200}>
                <TranslatableText
                  originalText={deal.originalTitle}
                  translatedText={deal.translatedTitle}
                  as="h1"
                  className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent leading-tight"
                />
              </EnhancedCard>

              {/* Product Badges - Enhanced Section */}
              <EnhancedCard className="p-6" delay={300}>
                <ProductBadges
                  deal={deal}
                  detailContent={detailContent || undefined}
                />
              </EnhancedCard>

              {/* Description */}
              <EnhancedCard className="p-6" delay={400}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">产品描述</h2>
                  <div className="text-sm text-gray-500">📋</div>
                </div>
                <TranslatableDescription
                  originalText={deal.originalDescription}
                  translatedText={deal.translatedDescription}
                  maxLines={4}
                  className="prose max-w-none"
                />
              </EnhancedCard>

              {/* Enhanced Detail Content */}
              <DealDetailContent
                dealId={dealId}
                dealUrl={deal.dealUrl}
                initialContent={deal.content || deal.translatedDescription}
                onContentLoaded={setDetailContent}
              />

              {/* Translation Info */}
              {deal.isTranslated && (
                <EnhancedCard className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 p-4" delay={600}>
                  <p className="text-blue-800 text-sm flex items-center">
                    <span className="mr-2">🌐</span>
                    此内容由 <strong className="mx-1">{deal.translationProvider?.toUpperCase() || 'DEEPL'}</strong>
                    从{deal.language === 'de' ? '德语' : '英语'}自动翻译，仅供参考
                  </p>
                </EnhancedCard>
              )}

              {/* Enhanced Action Buttons */}
              <EnhancedCard className="p-6" delay={700}>
                <div className="space-y-4">
                  <a
                    href={deal.dealUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white text-center py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <span>🛒</span>
                      <span>前往购买</span>
                      <span className="text-sm opacity-75">({deal.source})</span>
                    </span>
                  </a>

                  <div className="grid grid-cols-2 gap-3">
                    <Tooltip content="收藏此优惠，稍后查看">
                      <button className="flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02]">
                        <span>💖</span>
                        <span>收藏</span>
                      </button>
                    </Tooltip>
                    <Tooltip content="分享给朋友">
                      <button className="flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02]">
                        <span>📤</span>
                        <span>分享</span>
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </EnhancedCard>

              {/* Enhanced Meta Information */}
              <EnhancedCard className="bg-gradient-to-r from-gray-50 to-gray-100 p-6" delay={800}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">ℹ️</span>
                  详细信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm">🏷️</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">分类</div>
                      <div className="text-gray-600 text-sm">{deal.category}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-sm">🏪</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">来源</div>
                      <div className="text-gray-600 text-sm">{deal.source}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 text-sm">📅</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">发布时间</div>
                      <div className="text-gray-600 text-sm">{formatDate(deal.publishedAt)}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 text-sm">⏰</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">过期时间</div>
                      <div className="text-gray-600 text-sm">{formatDate(deal.expiresAt)}</div>
                    </div>
                  </div>
                </div>
              </EnhancedCard>
            </div>
          </div>
        </div>

        {/* Floating Action Buttons */}
        <FloatingActionButton
          icon="🛒"
          label="立即购买"
          onClick={() => window.open(deal.dealUrl, '_blank')}
          variant="primary"
        />

        {/* Back to top button - positioned differently to avoid overlap */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 left-6 z-50 w-12 h-12 bg-gray-600 hover:bg-gray-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
        >
          ↑
        </button>
      </div>
    </TranslationProvider>
  )
}