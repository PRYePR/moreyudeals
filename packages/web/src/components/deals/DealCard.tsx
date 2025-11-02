import Image from 'next/image'
import Link from 'next/link'
import { Deal } from '@/lib/db/types'
import { formatDistance } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface DealCardProps {
  deal: Deal
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

  const isExpired = deal.expiresAt ? new Date(deal.expiresAt) < new Date() : false
  const daysRemaining = getDaysRemaining(deal.expiresAt)
  const timeAgo = formatDistance(new Date(deal.publishedAt), new Date(), {
    addSuffix: true,
    locale: zhCN,
  })

  return (
    <Link href={`/deals/${deal.id}`}>
      <div className="deal-card group flex flex-col bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1">
        {/* Image Section */}
        <div className="relative w-full aspect-[16/9] overflow-hidden bg-gray-100">
          {deal.imageUrl ? (
            <Image
              src={deal.imageUrl}
              alt={deal.titleZh || deal.title}
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
            <div className="absolute top-2 left-2 w-10 h-10 bg-white rounded-md p-1 shadow-md">
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
        <div className="p-4 flex flex-col flex-1">
          {/* Category Badge */}
          {deal.categories && deal.categories.length > 0 && (
            <div className="mb-2">
              <span className="inline-block bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full font-medium">
                {deal.categories[0]}
              </span>
            </div>
          )}

          {/* Title - 优先显示中文翻译 */}
          <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors min-h-[3.5rem]">
            {deal.titleZh || deal.title}
          </h3>

          {/* Description - 优先显示中文翻译 */}
          {(deal.descriptionZh || deal.description) && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {deal.descriptionZh || deal.description}
            </p>
          )}

          {/* Price Section */}
          <div className="mt-auto">
            {deal.price !== null && (
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold text-green-600">
                  {formatPrice(deal.price, deal.currency)}
                </span>
                {deal.originalPrice && deal.originalPrice > deal.price && (
                  <span className="text-gray-400 line-through text-sm">
                    {formatPrice(deal.originalPrice, deal.currency)}
                  </span>
                )}
              </div>
            )}

            {/* Bottom Info */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1">
                {(deal.canonicalMerchantName || deal.merchant) && (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span className="truncate max-w-[100px]">{deal.canonicalMerchantName || deal.merchant}</span>
                  </>
                )}
              </div>
              <span>{timeAgo}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
