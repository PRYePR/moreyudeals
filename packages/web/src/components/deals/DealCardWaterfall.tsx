'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Store } from 'lucide-react'
import { formatRelativeTime, formatCurrency, calculateDiscount } from '@/lib/formatters'
import { TranslatableText } from '@/components/TranslatableContent'

interface Deal {
  id: string
  title?: string
  originalTitle?: string
  translatedTitle?: string
  imageUrl?: string
  price?: number | string
  originalPrice?: number | string
  currency?: string
  discount?: number
  merchant?: string
  merchantName?: string
  merchantLogo?: string
  merchantLink?: string
  publishedAt?: Date | string
  expiresAt?: Date | string
  dealUrl: string
  affiliateUrl?: string
  trackingUrl?: string
  category?: string
  tags?: string[]
  location?: string
}

interface DealCardWaterfallProps {
  deal: Deal
}

export default function DealCardWaterfall({ deal }: DealCardWaterfallProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 处理数据
  const displayTitle = deal.translatedTitle || deal.title || '无标题'
  const displayImage = deal.imageUrl || '/placeholder-product.jpg'
  const displayMerchant = deal.merchantName || deal.merchant || '未知商店'

  // 价格处理
  const currentPrice = deal.price ? (typeof deal.price === 'string' ? parseFloat(deal.price) : deal.price) : null
  const originalPrice = deal.originalPrice ? (typeof deal.originalPrice === 'string' ? parseFloat(deal.originalPrice) : deal.originalPrice) : null
  const currency = deal.currency || 'EUR'

  // 计算折扣
  const discountPercent = deal.discount || (currentPrice && originalPrice ? calculateDiscount(currentPrice, originalPrice) : null)

  // 相对时间
  const relativeTime = deal.publishedAt
    ? formatRelativeTime(deal.publishedAt, deal.expiresAt)
    : ''

  // 点击商家筛选
  const handleMerchantClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const merchantName = deal.merchantName || deal.merchant
    if (merchantName) {
      const layout = searchParams.get('layout')
      const url = `/deals?merchant=${encodeURIComponent(merchantName)}${layout ? `&layout=${layout}` : ''}`
      router.push(url)
    }
  }

  return (
    <Link href={`/deals/${deal.id}`} className="deal-card-waterfall bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full group block">
      {/* 图片区域 */}
      <div className="relative w-full aspect-square bg-gray-100 overflow-hidden flex-shrink-0">
        <Image
          src={displayImage}
          alt={displayTitle}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* 折扣徽章 - 覆盖在图片右上角，加大尺寸 */}
        {discountPercent && discountPercent > 0 && (
          <div className="absolute top-2 right-2 z-10">
            <span className="inline-flex items-center justify-center bg-action-primary text-white text-sm md:text-base font-bold px-3 py-1.5 rounded-md shadow-lg">
              -{discountPercent}%
            </span>
          </div>
        )}

        {/* 相对时间标签 - 左上角（可选） */}
        {relativeTime && (
          <div className="absolute top-2 left-2 z-10">
            <span className="inline-flex items-center text-xs bg-black/50 text-white px-2 py-1 rounded-md backdrop-blur-sm">
              {relativeTime}
            </span>
          </div>
        )}
      </div>

      {/* 信息区域 */}
      <div className="flex flex-col flex-1 p-3">
        {/* 标题 - 支持中文/德语切换，限制2行 */}
        <TranslatableText
          originalText={deal.originalTitle || deal.title || '无标题'}
          translatedText={deal.translatedTitle || deal.title || '无标题'}
          as="h3"
          className="text-sm font-semibold text-gray-900 line-clamp-2 hover:text-brand-primary transition-colors leading-tight mb-1"
        />

        {/* 价格区块 */}
        {currentPrice !== null && (
          <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
            <span className="text-xl font-bold text-action-primary">
              {formatCurrency(currentPrice, currency)}
            </span>
            {originalPrice && originalPrice > currentPrice && (
              <span className="text-xs text-gray-400 line-through">
                {formatCurrency(originalPrice, currency)}
              </span>
            )}
          </div>
        )}

        {/* 商家信息 */}
        <button
          onClick={handleMerchantClick}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-primary transition-colors mt-auto group/merchant w-fit"
          title={`筛选 ${displayMerchant} 的优惠`}
        >
          {deal.merchantLogo ? (
            <Image
              src={deal.merchantLogo}
              alt={displayMerchant}
              width={14}
              height={14}
              className="object-contain rounded"
            />
          ) : (
            <Store className="w-3.5 h-3.5 text-gray-400 group-hover/merchant:text-brand-primary transition-colors" />
          )}
          <span>{displayMerchant}</span>
        </button>

      </div>
    </Link>
  )
}
