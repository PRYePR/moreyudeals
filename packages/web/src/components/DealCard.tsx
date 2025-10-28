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
  merchant?: string           // 兼容旧字段
  merchantName?: string       // 新字段（后端返回）
  merchantLogo?: string
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
    <div className="deal-card group flex flex-col bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Top Section: Merchant Info Bar */}
      <div className="flex items-center px-4 py-3 border-b border-gray-100 bg-gray-50">
        {deal.merchantLogo ? (
          <Image
            src={deal.merchantLogo}
            alt={deal.merchantName || 'Merchant'}
            width={24}
            height={24}
            className="object-contain mr-3 rounded-sm"
          />
        ) : (
          <div className="w-6 h-6 mr-3 bg-gray-200 rounded-sm flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
        )}
        <span className="text-sm font-semibold text-gray-800 truncate flex-1">
          {deal.merchantName || deal.merchant || deal.source}
        </span>
        <span className="text-xs text-gray-500 ml-3 whitespace-nowrap">
          {formatDate(deal.publishedAt)}
        </span>
      </div>

      {/* Main Content Section */}
      <div className="flex flex-row p-4">
        {/* Left: Square Image Container */}
        <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 overflow-hidden rounded-md">
          <Image
            src={deal.imageUrl}
            alt={deal.translatedTitle}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
          />
          {deal.discountPercentage && (
            <div className="absolute top-2 right-2">
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow">
                -{deal.discountPercentage}%
              </span>
            </div>
          )}
          {daysRemaining <= 3 && daysRemaining > 0 && (
            <div className="absolute bottom-2 left-2">
              <span className="bg-orange-500 text-white px-2 py-1 rounded-md text-xs font-medium">
                还剩 {daysRemaining} 天
              </span>
            </div>
          )}
        </div>

        {/* Right: Content */}
        <div className="flex-1 pl-4 flex flex-col justify-between">
          <div>
            {/* Category Badge */}
            <div className="mb-2">
              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                {deal.category}
              </span>
            </div>

            {/* Deal Title */}
            <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-2 line-clamp-3 group-hover:text-primary-600 transition-colors">
              {deal.translatedTitle}
            </h3>
          </div>

          <div className="mt-auto">
            {/* Price Section */}
            {deal.price && (
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold text-red-600">
                  {formatPrice(deal.price, deal.currency)}
                </span>
                {deal.originalPrice && (
                  <span className="text-gray-400 line-through text-sm">
                    {formatPrice(deal.originalPrice, deal.currency)}
                  </span>
                )}
              </div>
            )}

            {/* Action Button */}
            <a
              href={`/deals/${deal.id}`}
              className="block w-full text-center bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg font-bold transition-colors duration-200"
            >
              查看详情 →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}