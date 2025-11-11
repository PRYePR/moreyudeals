import Image from 'next/image'
import Link from 'next/link'
import { Deal } from '@/lib/api-client/types'
import { formatDistance } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { TranslatableText } from '@/components/TranslatableContent'

type DealWithTranslations = Deal & {
  translatedTitle?: string | null
}

interface DealCardProps {
  deal: DealWithTranslations
}

export default function DealCard({ deal }: DealCardProps) {
  const formatPrice = (price: number | null, currency: string) => {
    if (!price) return null
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(price)
  }

  const getDaysRemaining = (expiresAt: Date | null) => {
    if (!expiresAt) return null
    const now = new Date()
    const expiration = new Date(expiresAt)
    const diffTime = expiration.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  // 格式化过期时间显示
  const formatExpiryTime = (expiresAt: Date | null) => {
    if (!expiresAt) return null
    const now = new Date()
    const expiration = new Date(expiresAt)
    const diffTime = expiration.getTime() - now.getTime()

    // 已过期
    if (diffTime <= 0) {
      return '已过期'
    }

    // 计算剩余时间
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // 小于1小时：显示"小于1小时"
    if (diffHours < 1) {
      return '小于1小时'
    }

    // 小于1天：显示小时
    if (diffDays < 1) {
      return `还剩 ${diffHours} 小时`
    }

    // 显示天数
    return `还剩 ${diffDays} 天`
  }

  const isExpired = deal.expiresAt ? new Date(deal.expiresAt) < new Date() : false
  const daysRemaining = getDaysRemaining(deal.expiresAt)

  // 优先显示过期时间,如果没有才显示发布时间
  const expiryDisplay = formatExpiryTime(deal.expiresAt)
  const publishedTimeAgo = deal.publishedAt ? formatDistance(new Date(deal.publishedAt), new Date(), {
    addSuffix: true,
    locale: zhCN,
  }) : '未知时间'

  const displayTime = expiryDisplay || publishedTimeAgo

  return (
    <Link href={`/deals/${deal.id}`}>
      <div className="deal-card group flex flex-col bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1">
        {/* Image Section */}
        <div className="relative w-full aspect-[16/9] overflow-hidden bg-gray-100">
          {deal.imageUrl ? (
            <Image
              src={deal.imageUrl}
              alt={deal.title || ''}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Merchant Logo - Top Left */}
          {deal.merchantLogo && (
            <div className="absolute top-2 left-2 w-8 h-8 md:w-10 md:h-10 bg-white rounded-md p-0.5 md:p-1 shadow-md">
              <Image
                src={deal.merchantLogo}
                alt={deal.canonicalMerchantName || deal.merchant || 'Merchant'}
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
          )}

          {/* Discount Badge - Top Right */}
          {deal.discount && deal.discount > 0 && (
            <div className="absolute top-2 right-2">
              <span className="bg-orange-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg">
                -{deal.discount}%
              </span>
            </div>
          )}

          {/* Expiry Warning - Bottom */}
          {daysRemaining !== null && daysRemaining <= 3 && daysRemaining > 0 && (
            <div className="absolute bottom-2 left-2">
              <span className="bg-red-500 text-white px-2 py-1 rounded-md text-xs font-medium shadow">
                还剩 {daysRemaining} 天
              </span>
            </div>
          )}

          {/* Expired Badge */}
          {isExpired && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold">
                已过期
              </span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-2 md:p-2.5 flex flex-col flex-1">
          {/* Category Badge */}
          {deal.categories && deal.categories.length > 0 && (
            <div className="mb-0.5 md:mb-1">
              <span className="inline-block bg-primary-100 text-primary-800 text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full font-medium">
                {deal.categories[0]}
              </span>
            </div>
          )}

          {/* Title - 支持中文/德语切换 */}
          {deal.title && (
            <TranslatableText
              originalText={deal.originalTitle || deal.title}
              translatedText={deal.translatedTitle || deal.title}
              as="h3"
              className="font-bold text-sm md:text-base leading-[1.2] md:leading-tight text-gray-900 mb-px md:mb-0.5 line-clamp-2 group-hover:text-primary-600 transition-colors"
            />
          )}

          {/* Description - 显示翻译后的描述 */}
          {deal.description && (
            <p className="text-xs md:text-sm leading-[1.2] md:leading-tight text-gray-600 mb-px md:mb-0.5 line-clamp-2">
              {deal.description}
            </p>
          )}

          {/* Price Section */}
          <div className="mt-auto">
            {deal.price !== null && (
              <div className="flex items-baseline gap-1.5 md:gap-2 mb-0.5 md:mb-1">
                <span className="text-2xl md:text-3xl font-bold text-red-600">
                  {formatPrice(deal.price, deal.currency)}
                </span>
                {deal.originalPrice && deal.originalPrice > deal.price && (
                  <span className="text-gray-400 line-through text-[10px] md:text-xs">
                    {formatPrice(deal.originalPrice, deal.currency)}
                  </span>
                )}
              </div>
            )}

            {/* Bottom Info */}
            <div className="flex items-center justify-between text-[8px] md:text-[10px] text-gray-400">
              <div className="flex items-center gap-0.5">
                {(deal.canonicalMerchantName || deal.merchant) && (
                  <>
                    <svg className="w-2 h-2 md:w-2.5 md:h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span className="truncate max-w-[70px] md:max-w-[100px]">{deal.canonicalMerchantName || deal.merchant}</span>
                  </>
                )}
              </div>
              <span>{displayTime}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
