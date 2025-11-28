'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  TranslationProvider,
  TranslationControl,
  TranslatableText,
  TranslatableHtmlContent
} from '@/components/TranslatableContent'

interface DealModalContentProps {
  dealId: string
}

export default function DealModalContent({ dealId }: DealModalContentProps) {
  const router = useRouter()
  const [deal, setDeal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取 deal 数据
  useEffect(() => {
    async function fetchDeal() {
      try {
        const response = await fetch(`/api/deals/${encodeURIComponent(dealId)}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('优惠未找到')
          } else {
            setError('加载失败')
          }
          return
        }
        const data = await response.json()
        setDeal(data)
      } catch (err) {
        setError('网络错误')
      } finally {
        setLoading(false)
      }
    }
    fetchDeal()
  }, [dealId])

  // 加载中
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">加载中...</p>
      </div>
    )
  }

  // 错误状态
  if (error || !deal) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{error || '优惠未找到'}</h2>
        <p className="text-gray-600">该优惠可能已过期或不存在</p>
      </div>
    )
  }

  // 格式化过期时间显示
  const formatExpiryTime = (expiresAt: string | null) => {
    if (!expiresAt) return null
    const now = new Date()
    const expiration = new Date(expiresAt)
    const diffTime = expiration.getTime() - now.getTime()
    if (diffTime <= 0) return '已过期'
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    if (diffHours < 1) return '小于1小时'
    if (diffHours < 24) return `${diffHours} 小时`
    return `${diffDays} 天`
  }

  const timeStatus = deal.timeStatus || {
    publishedAbsolute: '时间信息暂缺',
    publishedRelative: null,
    isExpired: false
  }
  const isExpired = timeStatus.isExpired
  const expiryDisplay = formatExpiryTime(deal.expiresAt)
  const displayTimeLabel = expiryDisplay ? '剩余' : '发布'
  const displayTimeValue = expiryDisplay || timeStatus.publishedRelative || timeStatus.publishedAbsolute

  const purchaseUrl = deal.trackingUrl || deal.affiliateUrl || deal.dealUrl || deal.originalUrl || ''
  const hasPurchaseLink = typeof purchaseUrl === 'string' && (purchaseUrl.startsWith('http') || purchaseUrl.startsWith('/'))

  const handleMerchantClick = () => {
    if (deal.merchantName) {
      // 使用 window.location.href 强制整页导航，确保 Modal 关闭
      window.location.href = `/?merchant=${encodeURIComponent(deal.merchantName)}`
    }
  }

  const formatPrice = (price: string | number | undefined) => {
    if (!price) return null
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(numPrice)
  }

  const getNumericPrice = (price: string | number | undefined): number => {
    if (!price) return 0
    return typeof price === 'string' ? parseFloat(price) : price
  }

  const calculateDiscountPercentage = (): number | null => {
    if (deal.discountPercentage && deal.discountPercentage > 0) return deal.discountPercentage
    const original = getNumericPrice(deal.originalPrice)
    const current = getNumericPrice(deal.price)
    if (original > 0 && current > 0 && original > current) {
      return Math.round(((original - current) / original) * 100)
    }
    return null
  }

  const discountPercent = calculateDiscountPercentage()

  return (
    <TranslationProvider>
      {/* 翻译控制 - 添加右边距避免与关闭按钮重叠 */}
      <div className="flex justify-end pl-4 sm:pl-6 pt-4 pb-2 pr-20">
        <TranslationControl />
      </div>

      {/* 过期警告 */}
      {isExpired && (
        <div className="mx-4 sm:mx-6 mb-3 sm:mb-4 bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <div className="font-semibold text-red-800 text-sm sm:text-base">此优惠可能已过期</div>
              <div className="text-xs sm:text-sm text-red-700 mt-0.5 sm:mt-1">请在商家页面确认当前价格和库存</div>
            </div>
          </div>
        </div>
      )}

      {/* 主内容 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
        {/* 左侧图片区域 */}
        <div className="md:col-span-2 bg-gray-100 relative aspect-square md:aspect-auto">
          <div className="relative w-full h-full min-h-[300px] md:min-h-[400px] p-8">
            {/* 商品图片 */}
            {deal.imageUrl && (
              <img
                src={deal.imageUrl}
                alt={deal.title}
                className="w-full h-full object-contain product-image"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // 图片加载失败时隐藏图片，显示 fallback
                  e.currentTarget.onerror = null
                  e.currentTarget.style.display = 'none'
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement
                  if (fallback) fallback.style.display = 'flex'
                }}
              />
            )}
            {/* Fallback: 商店图标 + 商家名 */}
            <div
              className="w-full h-full flex flex-col items-center justify-center"
              style={{ display: deal.imageUrl ? 'none' : 'flex' }}
            >
              <svg className="w-24 h-24 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="text-sm text-gray-400 font-medium">
                {deal.merchantName || '优惠活动'}
              </span>
            </div>
            {discountPercent && discountPercent > 0 && (
              <div className="absolute top-4 right-4 bg-action-primary text-white px-3 py-1.5 rounded-md font-bold text-lg shadow-lg z-10">
                -{discountPercent}%
              </div>
            )}
          </div>
        </div>

        {/* 右侧信息区域 */}
        <div className="md:col-span-3 p-4 sm:p-6 md:p-8 flex flex-col">
          {/* 标题 */}
          <div className="mb-3 sm:mb-4">
            <TranslatableText
              originalText={deal.originalTitle || deal.title}
              translatedText={deal.translatedTitle || deal.title}
              as="h1"
              className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-tight"
            />
          </div>

          {/* 价格区域 */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-baseline flex-wrap gap-x-2 sm:gap-x-3 gap-y-1">
              {deal.price && (
                <div className="text-3xl sm:text-4xl font-bold text-action-primary">
                  {formatPrice(deal.price)}
                </div>
              )}
              {deal.originalPrice && getNumericPrice(deal.originalPrice) > getNumericPrice(deal.price) && (
                <div className="text-lg sm:text-xl text-gray-500 line-through">
                  {formatPrice(deal.originalPrice)}
                </div>
              )}
              {deal.originalPrice && deal.price && getNumericPrice(deal.originalPrice) > getNumericPrice(deal.price) && (
                <div className="text-base sm:text-lg text-green-600 font-bold">
                  {discountPercent && `-${discountPercent}%`} 省{formatPrice(getNumericPrice(deal.originalPrice) - getNumericPrice(deal.price))}
                </div>
              )}
            </div>
          </div>

          {/* 商家信息 */}
          {deal.merchantName && (
            <button
              onClick={handleMerchantClick}
              className="mb-4 sm:mb-6 flex items-center gap-2 p-2 sm:p-2.5 bg-gray-50 hover:bg-orange-50 rounded-lg border border-gray-200 hover:border-orange-300 transition-all w-full text-left group cursor-pointer"
              title={`查看 ${deal.merchantName} 的所有优惠`}
            >
              <span className="text-xs sm:text-sm text-gray-600">商家:</span>
              {deal.merchantLogo && (
                <div className="relative w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0">
                  <img
                    src={deal.merchantLogo}
                    alt={deal.merchantName}
                    className="w-full h-full object-contain"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // 商家 Logo 加载失败时隐藏容器
                      e.currentTarget.onerror = null
                      const container = e.currentTarget.parentElement
                      if (container) container.style.display = 'none'
                    }}
                  />
                </div>
              )}
              <div className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                {deal.merchantName}
              </div>
              <svg className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          )}

          {/* CTA 按钮 */}
          <div className="mb-4 sm:mb-6">
            {hasPurchaseLink ? (
              <a
                href={purchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-brand-primary hover:bg-brand-hover active:bg-brand-hover text-white text-center py-3.5 sm:py-4 px-5 sm:px-6 rounded-lg font-bold text-base sm:text-lg transition-colors shadow-md hover:shadow-lg min-h-[48px] flex items-center justify-center"
              >
                前往商家查看优惠
              </a>
            ) : (
              <div className="block w-full bg-gray-300 text-gray-500 text-center py-3.5 sm:py-4 px-5 sm:px-6 rounded-lg font-bold text-base sm:text-lg cursor-not-allowed min-h-[48px] flex items-center justify-center">
                暂无购买链接
              </div>
            )}
          </div>

          {/* 时间信息 */}
          <div className="mt-auto pt-3 sm:pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm text-gray-600">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{displayTimeLabel}: {displayTimeValue}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 描述卡片 */}
      {(deal.content || deal.contentHtml || deal.description) && (
        <div className="mx-4 sm:mx-6 mb-6 bg-gray-50 rounded-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">优惠详情</h2>
          <TranslatableHtmlContent
            originalHtml={deal.contentHtml || ''}
            translatedHtml={deal.description || deal.content || ''}
            className="prose prose-sm sm:prose max-w-none text-gray-700 leading-relaxed"
          />
        </div>
      )}

      {/* 翻译提示 */}
      {deal.isTranslated && (
        <div className="mx-4 sm:mx-6 mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-xs sm:text-sm text-blue-800">
              <span className="font-semibold">翻译提示：</span>
              此内容由 {deal.translationProvider?.toUpperCase() || 'DEEPL'} 从{deal.language === 'de' ? '德语' : '英语'}自动翻译，仅供参考
            </div>
          </div>
        </div>
      )}
    </TranslationProvider>
  )
}
