'use client'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = ''
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full'

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  const variantClasses = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    neutral: 'bg-gray-100 text-gray-800'
  }

  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}

interface DiscountBadgeProps {
  percentage: number
  className?: string
}

export function DiscountBadge({ percentage, className = '' }: DiscountBadgeProps) {
  return (
    <Badge variant="error" size="lg" className={`font-bold ${className}`}>
      -{percentage}%
    </Badge>
  )
}

interface StockStatusProps {
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'available' | 'unavailable'
  className?: string
}

export function StockStatus({ status, className = '' }: StockStatusProps) {
  const statusConfig = {
    in_stock: { text: '有库存', variant: 'success' as const, icon: '✓' },
    low_stock: { text: '库存紧张', variant: 'warning' as const, icon: '⚠️' },
    out_of_stock: { text: '缺货', variant: 'error' as const, icon: '✕' },
    available: { text: '可购买', variant: 'success' as const, icon: '✓' },
    unavailable: { text: '暂不可购买', variant: 'error' as const, icon: '✕' }
  }

  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} className={className}>
      <span className="mr-1">{config.icon}</span>
      {config.text}
    </Badge>
  )
}

interface RetailerBadgeProps {
  name: string
  logo?: string
  url?: string
  rating?: number
  className?: string
}

export function RetailerBadge({
  name,
  logo,
  url,
  rating,
  className = ''
}: RetailerBadgeProps) {
  const content = (
    <div className={`flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors duration-200 ${className}`}>
      {logo && (
        <img
          src={logo}
          alt={name}
          className="w-5 h-5 object-contain"
        />
      )}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-900">{name}</span>
        {rating && (
          <div className="flex items-center space-x-1">
            <span className="text-xs text-yellow-500">★</span>
            <span className="text-xs text-gray-600">{rating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  )

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
      >
        {content}
      </a>
    )
  }

  return content
}

interface PriceBadgeProps {
  currentPrice: string
  originalPrice?: string
  currency: string
  discount?: number
  className?: string
}

export function PriceBadge({
  currentPrice,
  originalPrice,
  currency,
  discount,
  className = ''
}: PriceBadgeProps) {
  const formatPrice = (price: string, currency: string) => {
    const number = parseFloat(price)
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
    }).format(number)
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg px-4 py-3 ${className}`}>
      <div className="flex items-baseline space-x-3">
        <span className="text-2xl font-bold text-green-600">
          {formatPrice(currentPrice, currency)}
        </span>

        {originalPrice && parseFloat(originalPrice) > parseFloat(currentPrice) && (
          <>
            <span className="text-lg text-gray-400 line-through">
              {formatPrice(originalPrice, currency)}
            </span>
            {discount && (
              <Badge variant="success" size="sm">
                省 {discount}%
              </Badge>
            )}
          </>
        )}
      </div>

      {originalPrice && parseFloat(originalPrice) > parseFloat(currentPrice) && (
        <div className="mt-1 text-sm text-green-600">
          💰 节省 {formatPrice((parseFloat(originalPrice) - parseFloat(currentPrice)).toString(), currency)}
        </div>
      )}
    </div>
  )
}

interface CategoryBadgeProps {
  category: string
  subcategory?: string
  className?: string
}

export function CategoryBadge({ category, subcategory, className = '' }: CategoryBadgeProps) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Badge variant="info">
        {category}
      </Badge>
      {subcategory && (
        <>
          <span className="text-gray-400">→</span>
          <Badge variant="neutral" size="sm">
            {subcategory}
          </Badge>
        </>
      )}
    </div>
  )
}

interface ShippingBadgeProps {
  shippingInfo: string
  isFree?: boolean
  estimatedDays?: number
  className?: string
}

export function ShippingBadge({
  shippingInfo,
  isFree = false,
  estimatedDays,
  className = ''
}: ShippingBadgeProps) {
  return (
    <Badge
      variant={isFree ? 'success' : 'info'}
      className={className}
    >
      <span className="mr-1">🚚</span>
      {isFree ? '免运费' : shippingInfo}
      {estimatedDays && (
        <span className="ml-1 text-xs opacity-75">
          ({estimatedDays}天)
        </span>
      )}
    </Badge>
  )
}

interface ProductBadgesProps {
  deal: {
    discountPercentage?: number
    category: string
    source: string
    price: string
    originalPrice?: string
    currency: string
    isTranslated?: boolean
    translationProvider?: string
  }
  detailContent?: {
    pricing: {
      availability: string
      shippingInfo?: string
    }
    retailer: {
      name: string
      logo?: string
      url: string
    }
  }
  className?: string
}

export function ProductBadges({ deal, detailContent, className = '' }: ProductBadgesProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Price and Discount */}
      <div className="flex flex-wrap items-center gap-3">
        <PriceBadge
          currentPrice={deal.price}
          originalPrice={deal.originalPrice}
          currency={deal.currency}
          discount={deal.discountPercentage}
        />

        {deal.discountPercentage && (
          <DiscountBadge percentage={deal.discountPercentage} />
        )}
      </div>

      {/* Stock and Availability */}
      <div className="flex flex-wrap items-center gap-3">
        {detailContent?.pricing.availability && (
          <StockStatus
            status={detailContent.pricing.availability.toLowerCase().includes('verfügbar') ? 'available' : 'unavailable'}
          />
        )}

        {detailContent?.pricing.shippingInfo && (
          <ShippingBadge
            shippingInfo={detailContent.pricing.shippingInfo}
            isFree={detailContent.pricing.shippingInfo.toLowerCase().includes('kostenlos') ||
                   detailContent.pricing.shippingInfo.toLowerCase().includes('free')}
          />
        )}
      </div>

      {/* Category and Source */}
      <div className="flex flex-wrap items-center gap-3">
        <CategoryBadge category={deal.category} />

        <RetailerBadge
          name={detailContent?.retailer.name || deal.source}
          logo={detailContent?.retailer.logo}
          url={detailContent?.retailer.url}
        />
      </div>

      {/* Translation Info */}
      {deal.isTranslated && (
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="info" size="sm">
            <span className="mr-1">🌐</span>
            {deal.translationProvider?.toUpperCase()} 翻译
          </Badge>
        </div>
      )}
    </div>
  )
}