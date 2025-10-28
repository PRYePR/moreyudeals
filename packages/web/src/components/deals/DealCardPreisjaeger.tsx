'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MessageCircle, Share2, Bookmark, ExternalLink, MapPin, Store } from 'lucide-react'
import { formatRelativeTime, formatCurrency, calculateDiscount } from '@/lib/formatters'

interface Deal {
  id: string
  title?: string
  translatedTitle?: string
  imageUrl?: string
  price?: number | string
  originalPrice?: number | string
  currency?: string
  discount?: number
  merchant?: string           // 兼容旧字段
  merchantName?: string       // 新字段（后端返回）
  merchantLogo?: string
  merchantLink?: string
  publishedAt?: Date | string
  expiresAt?: Date | string
  dealUrl: string
  category?: string
  tags?: string[]
  location?: string
}

interface DealCardPreisjaegerProps {
  deal: Deal
}

export default function DealCardPreisjaeger({ deal }: DealCardPreisjaegerProps) {
  const [isFavorited, setIsFavorited] = useState(false)

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

  // 收藏功能
  const handleFavorite = () => {
    setIsFavorited(!isFavorited)
  }

  // 分享功能
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: displayTitle,
        url: `/deals/${deal.id}`,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/deals/${deal.id}`)
    }
  }

  // 购买链接：后台已处理好逻辑（实际链接或详情页），前端直接使用
  // deal.link 已经是最终跳转地址（购买链接 or 详情页）

  return (
    <article className="deal-card-preisjaeger bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      {/* 移动端：顶部商店信息栏 */}
      <div className="lg:hidden deal-card-header flex items-center justify-between px-4 py-3 bg-gray-50">
        {/* 商店Logo + 名字 */}
        <div className="store-info flex items-center gap-2">
          {deal.merchantLogo ? (
            <Image
              src={deal.merchantLogo}
              alt={displayMerchant}
              width={28}
              height={28}
              className="object-contain rounded"
            />
          ) : (
            <Store className="w-6 h-6 text-gray-400" />
          )}
          <span className="text-sm font-bold text-gray-800">{displayMerchant}</span>
        </div>

        {/* 相对时间标签 */}
        {relativeTime && (
          <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
            {relativeTime}
          </span>
        )}
      </div>

      {/* 主体区域：桌面端横向布局，移动端横向紧凑布局 */}
      <div className="deal-card-body flex flex-row lg:flex-row p-3 lg:p-4">
        {/* 左侧：移动端图片+按钮组合，桌面端仅图片 */}
        <div className="flex flex-col gap-2 lg:contents">
          {/* 商品图片（移动端固定宽度正方形，桌面端固定宽度） */}
          <Link href={`/deals/${deal.id}`} className="deal-image-container relative w-28 h-28 lg:w-44 lg:h-44 flex-shrink-0 group">
            <div className="relative w-full h-full bg-gray-100 overflow-hidden rounded-md lg:rounded-lg">
              <Image
                src={displayImage}
                alt={displayTitle}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 1024px) 112px, 256px"
              />
              {/* 折扣徽章 */}
              {discountPercent && discountPercent > 0 && (
                <div className="absolute top-2 right-2">
                  <span className="inline-flex items-center justify-center bg-action-primary text-white text-xs lg:text-sm font-bold px-2 py-1 lg:px-3 lg:py-1.5 rounded-md shadow-lg">
                    -{discountPercent}%
                  </span>
                </div>
              )}
            </div>
          </Link>

          {/* 移动端：图片下方的评论和分享按钮 */}
          <div className="flex lg:hidden items-center gap-1">
            {/* 评论 */}
            <button
              onClick={() => window.location.href = `/deals/${deal.id}#comments`}
              className="flex items-center justify-center gap-1 px-2 py-1.5 text-sm text-gray-600 hover:text-brand-primary hover:bg-gray-50 rounded-lg transition-colors flex-1"
              title="评论"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs">0</span>
            </button>

            {/* 分享 */}
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-1 px-2 py-1.5 text-sm text-gray-600 hover:text-brand-primary hover:bg-gray-50 rounded-lg transition-colors flex-1"
              title="分享"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 右：内容区 */}
        <div className="deal-content flex-1 flex flex-col min-w-0 pl-3 lg:pl-4">
          {/* 桌面端：顶部商店信息 + 时间标签 */}
          <div className="hidden lg:flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
            {/* 商店信息 */}
            <div className="store-info flex items-center gap-2">
              {deal.merchantLogo ? (
                <Image
                  src={deal.merchantLogo}
                  alt={displayMerchant}
                  width={28}
                  height={28}
                  className="object-contain rounded"
                />
              ) : (
                <Store className="w-6 h-6 text-gray-400" />
              )}
              <span className="text-base font-semibold text-brand-primary">{displayMerchant}</span>
            </div>

            {/* 相对时间标签 */}
            {relativeTime && (
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full whitespace-nowrap">
                {relativeTime}
              </span>
            )}
          </div>

          {/* 内容主体 */}
          <div className="flex-1 flex flex-col gap-2 lg:gap-0">
            {/* 标题 */}
            <Link href={`/deals/${deal.id}`}>
              <h3 className="text-base lg:text-xl font-bold text-gray-900 line-clamp-2 hover:text-brand-primary transition-colors lg:mb-3">
                {displayTitle}
              </h3>
            </Link>

            {/* 价格区块 */}
            {currentPrice !== null && (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xl lg:text-3xl font-bold text-action-primary">
                  {formatCurrency(currentPrice, currency)}
                </span>
                {originalPrice && originalPrice > currentPrice && (
                  <>
                    <span className="text-xs lg:text-sm text-gray-400 line-through">
                      {formatCurrency(originalPrice, currency)}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-support-green text-white text-xs font-bold">
                      -{discountPercent}%
                    </span>
                  </>
                )}
              </div>
            )}

            {/* 位置信息（可选） - 仅桌面端显示 */}
            {deal.location && (
              <div className="hidden lg:flex items-center gap-1 text-xs text-gray-500 mb-2">
                <MapPin className="w-3.5 h-3.5" />
                <span>{deal.location}</span>
              </div>
            )}

            {/* 底部操作栏 */}
            <div className="mt-auto flex items-center gap-1 lg:gap-2 pt-2 lg:pt-3 lg:border-t lg:border-gray-100">
              {/* 桌面端：评论 */}
              <button
                onClick={() => window.location.href = `/deals/${deal.id}#comments`}
                className="hidden lg:flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-brand-primary hover:bg-gray-50 rounded-lg transition-colors"
                title="评论"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm">0</span>
              </button>

              {/* 桌面端：分享 */}
              <button
                onClick={handleShare}
                className="hidden lg:flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-brand-primary hover:bg-gray-50 rounded-lg transition-colors"
                title="分享"
              >
                <Share2 className="w-4 h-4" />
              </button>

              {/* 桌面端：收藏 */}
              <button
                onClick={handleFavorite}
                className={`hidden lg:flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  isFavorited
                    ? 'text-red-600 bg-red-50'
                    : 'text-gray-600 hover:text-brand-primary hover:bg-gray-50'
                }`}
                title="收藏"
              >
                <Bookmark className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
              </button>

              {/* 主操作按钮 - 移动端空心橙色边框样式，桌面端实心样式 */}
              <a
                href={deal.dealUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full lg:w-auto lg:ml-auto flex items-center justify-center gap-1.5 px-4 lg:px-6 py-1.5 lg:py-2 text-xs lg:text-sm font-semibold rounded-full transition-colors whitespace-nowrap border-2 lg:bg-action-primary lg:hover:bg-action-hover lg:text-white lg:border-action-primary border-action-primary text-action-primary hover:bg-action-primary hover:text-white"
              >
                去购买
              </a>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
