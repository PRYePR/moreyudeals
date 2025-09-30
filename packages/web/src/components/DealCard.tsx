import Image from 'next/image'

interface Deal {
  id: string
  title: string
  originalTitle: string
  translatedTitle: string
  description: string
  originalDescription: string
  translatedDescription: string
  price: string
  originalPrice?: string
  currency: string
  discountPercentage?: number
  imageUrl: string
  dealUrl: string
  category: string
  source: string
  publishedAt: Date | string
  expiresAt: Date | string
  language: 'de' | 'en'
  translationProvider: 'deepl' | 'microsoft' | 'google'
  isTranslated: boolean
}

interface DealCardProps {
  deal: Deal
}

export default function DealCard({ deal }: DealCardProps) {

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
      month: 'short',
      day: 'numeric',
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
    <div className="deal-card group flex flex-row bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Left: Square Image Container */}
      <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 overflow-hidden">
        <Image
          src={deal.imageUrl}
          alt={deal.translatedTitle}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-300"
        />

        {/* Discount Badge */}
        {deal.discountPercentage && (
          <div className="absolute top-2 right-2">
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow">
              -{deal.discountPercentage}%
            </span>
          </div>
        )}

        {/* Expiration Warning */}
        {daysRemaining <= 3 && daysRemaining > 0 && (
          <div className="absolute bottom-2 left-2">
            <span className="bg-orange-500 text-white px-2 py-1 rounded-md text-xs font-medium">
              还剩 {daysRemaining} 天
            </span>
          </div>
        )}
      </div>

      {/* Right: Content */}
      <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between">
        {/* Top Section: Title and Description */}
        <div className="flex-1">
          {/* Category Badge */}
          <div className="mb-2">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
              {deal.category}
            </span>
          </div>

          {/* Deal Title */}
          <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {deal.translatedTitle}
          </h3>

          {/* Deal Description */}
          <p className="text-gray-600 text-xs sm:text-sm mb-2 line-clamp-2">
            {deal.translatedDescription}
          </p>
        </div>

        {/* Bottom Section: Price and Button */}
        <div>
          {/* Price Section - 始终显示价格标签 */}
          {deal.price && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg sm:text-xl font-bold text-primary-600">
                {formatPrice(deal.price, deal.currency)}
              </span>
              {deal.originalPrice && (
                <span className="text-gray-400 line-through text-sm">
                  {formatPrice(deal.originalPrice, deal.currency)}
                </span>
              )}
              {deal.discountPercentage && (
                <span className="text-green-600 font-semibold text-xs sm:text-sm ml-auto">
                  省 {deal.discountPercentage}%
                </span>
              )}
            </div>
          )}

          {/* Meta Information and Button Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col text-xs text-gray-500">
              <span className="truncate">{deal.source}</span>
              <span>{formatDate(deal.publishedAt)}</span>
            </div>

            {/* Action Button */}
            <a
              href={`/deals/${deal.id}`}
              className="flex-shrink-0 bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm py-2 px-3 sm:px-4 rounded-lg font-medium transition-colors duration-200 whitespace-nowrap"
            >
              查看详情 →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}