'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  TranslationProvider,
  TranslationControl,
  TranslatableText,
  TranslatableDescription
} from '@/components/TranslatableContent'

interface DealPageClientProps {
  deal: any
  dealId: string
}

export default function DealPageClient({ deal, dealId }: DealPageClientProps) {
  // 使用服务端计算的时间状态
  const timeStatus = deal.timeStatus || {
    publishedAbsolute: '时间信息暂缺',
    publishedRelative: null,
    expiresAbsolute: null,
    badgeLabel: '时间信息暂缺',
    badgeTone: 'published' as const,
    daysRemaining: null,
    isExpired: false
  }

  const isExpired = timeStatus.isExpired
  const purchaseUrl = deal.trackingUrl || deal.affiliateUrl || deal.dealUrl || deal.originalUrl || ''
  const hasPurchaseLink = typeof purchaseUrl === 'string' && purchaseUrl.startsWith('http')

  // 格式化价格
  const formatPrice = (price: string | number | undefined) => {
    if (!price) return null
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    return new Intl.NumberFormat('de-AT', {
      style: 'currency',
      currency: 'EUR'
    }).format(numPrice)
  }

  // 转换价格为数字
  const getNumericPrice = (price: string | number | undefined): number => {
    if (!price) return 0
    return typeof price === 'string' ? parseFloat(price) : price
  }

  return (
    <TranslationProvider>
      {/* 顶部导航栏 - 移动端优化 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center space-x-1.5 sm:space-x-2 text-gray-700 hover:text-orange-600 font-medium transition-colors min-h-[44px] -ml-2 pl-2 pr-3"
            >
              <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm sm:text-base">返回首页</span>
            </Link>
            <div className="min-h-[44px] flex items-center">
              <TranslationControl />
            </div>
          </div>
        </div>
      </header>

      <main className="bg-gray-50 min-h-screen pb-8 sm:pb-12">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-6">

          {/* 过期警告 - 移动端优化 */}
          {isExpired && (
            <div className="mb-3 sm:mb-4 bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
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

          {/* 主卡片 - 移动端优化 */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-0">

              {/* 左侧图片区域 - 占2列 */}
              <div className="md:col-span-2 bg-gray-100 relative aspect-square md:aspect-auto">
                <div className="relative w-full h-full min-h-[300px] md:min-h-[400px]">
                  <Image
                    src={deal.imageUrl || '/placeholder-deal.png'}
                    alt={deal.title}
                    fill
                    className="object-contain p-8"
                    priority
                  />

                  {/* 折扣徽章 */}
                  {deal.discountPercentage && deal.discountPercentage > 0 && (
                    <div className="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1.5 rounded-md font-bold text-lg shadow-lg">
                      -{deal.discountPercentage}%
                    </div>
                  )}
                </div>
              </div>

              {/* 右侧信息区域 - 占3列 - 移动端优化 */}
              <div className="md:col-span-3 p-4 sm:p-6 md:p-8 flex flex-col">

                {/* 标题 - 移动端字体优化 */}
                <div className="mb-3 sm:mb-4">
                  <TranslatableText
                    originalText={deal.originalTitle || deal.title}
                    translatedText={deal.title}
                    as="h1"
                    className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-tight"
                  />
                </div>

                {/* 价格区域 - 移动端优化 */}
                <div className="mb-4 sm:mb-6">
                  <div className="flex items-baseline flex-wrap gap-x-2 sm:gap-x-3 gap-y-1 mb-1.5 sm:mb-2">
                    {deal.price && (
                      <div className="text-3xl sm:text-4xl font-bold text-gray-900">
                        {formatPrice(deal.price)}
                      </div>
                    )}
                    {deal.originalPrice && getNumericPrice(deal.originalPrice) > getNumericPrice(deal.price) && (
                      <div className="text-lg sm:text-xl text-gray-500 line-through">
                        {formatPrice(deal.originalPrice)}
                      </div>
                    )}
                  </div>
                  {deal.originalPrice && deal.price && getNumericPrice(deal.originalPrice) > getNumericPrice(deal.price) && (
                    <div className="text-sm sm:text-base text-green-600 font-medium">
                      节省 {formatPrice(getNumericPrice(deal.originalPrice) - getNumericPrice(deal.price))}
                    </div>
                  )}
                </div>

                {/* 商家信息 - 移动端优化 */}
                {deal.merchantName && (
                  <div className="mb-4 sm:mb-6 flex items-center space-x-2.5 sm:space-x-3 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                    {deal.merchantLogo && (
                      <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                        <Image
                          src={deal.merchantLogo}
                          alt={deal.merchantName}
                          fill
                          className="object-contain"
                        />
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">商家</div>
                      <div className="text-base sm:text-lg font-semibold text-gray-900">{deal.merchantName}</div>
                    </div>
                  </div>
                )}

                {/* CTA 按钮 - 移动端优化触摸目标 */}
                <div className="mb-4 sm:mb-6">
                  {hasPurchaseLink ? (
                    <a
                      href={purchaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-center py-3.5 sm:py-4 px-5 sm:px-6 rounded-lg font-bold text-base sm:text-lg transition-colors shadow-md hover:shadow-lg min-h-[48px] flex items-center justify-center"
                    >
                      前往商家查看优惠
                    </a>
                  ) : (
                    <div className="block w-full bg-gray-300 text-gray-500 text-center py-3.5 sm:py-4 px-5 sm:px-6 rounded-lg font-bold text-base sm:text-lg cursor-not-allowed min-h-[48px] flex items-center justify-center">
                      暂无购买链接
                    </div>
                  )}
                </div>

                {/* 时间信息 - 移动端优化 */}
                <div className="mt-auto pt-3 sm:pt-4 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>发布: {timeStatus.publishedRelative || timeStatus.publishedAbsolute}</span>
                    </div>
                    {timeStatus.expiresAbsolute && (
                      <div className="flex items-center space-x-1.5 sm:space-x-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>过期: {timeStatus.expiresAbsolute}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 描述卡片 - 移动端优化 - 显示完整 content */}
          {(deal.content) && (
            <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">优惠详情</h2>
              <div
                className="prose prose-sm sm:prose max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: deal.content }}
              />
            </div>
          )}

          {/* 元数据卡片 - 移动端优化 */}
          <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">额外信息</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {deal.category && (
                <div>
                  <div className="text-xs sm:text-sm text-gray-500 mb-1">分类</div>
                  <div className="font-medium text-sm sm:text-base text-gray-900">{deal.category}</div>
                </div>
              )}
              {deal.source && (
                <div>
                  <div className="text-xs sm:text-sm text-gray-500 mb-1">来源</div>
                  <div className="font-medium text-sm sm:text-base text-gray-900">{deal.source}</div>
                </div>
              )}
              {deal.dealUrl && (
                <div className="sm:col-span-2">
                  <div className="text-xs sm:text-sm text-gray-500 mb-1">原始链接</div>
                  <a
                    href={deal.dealUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-700 font-medium break-all text-sm sm:text-base min-h-[44px] inline-block"
                  >
                    {deal.dealUrl}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* 翻译提示 - 移动端优化 */}
          {deal.isTranslated && (
            <div className="mt-4 sm:mt-6 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
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
        </div>
      </main>
    </TranslationProvider>
  )
}
