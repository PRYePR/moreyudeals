'use client'

interface AdSlotProps {
  variant?: 'default' | 'compact' | 'banner'
  title?: string
  description?: string
  ctaText?: string
  onCtaClick?: () => void
}

export default function AdSlot({
  variant = 'default',
  title = '广告位',
  description = '推广您的产品或服务',
  ctaText = '了解更多',
  onCtaClick
}: AdSlotProps) {
  const handleClick = () => {
    if (onCtaClick) {
      onCtaClick()
    } else {
      console.log('AdSlot clicked - configure your ad here')
    }
  }

  // Banner 变体（横幅广告）
  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-brand-primary/10 to-brand-hover/10 rounded-lg border border-brand-primary/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📢</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
              <p className="text-xs text-gray-600 mt-0.5">{description}</p>
            </div>
          </div>
          <button
            onClick={handleClick}
            className="px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-hover transition-colors"
          >
            {ctaText}
          </button>
        </div>
      </div>
    )
  }

  // Compact 变体（紧凑型）
  if (variant === 'compact') {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📢</span>
          <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
        </div>
        <p className="text-xs text-gray-600 mb-2">{description}</p>
        <button
          onClick={handleClick}
          className="text-xs text-brand-primary font-medium hover:underline"
        >
          {ctaText}
        </button>
      </div>
    )
  }

  // Default 变体（默认）
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-3 bg-gray-200 rounded-full flex items-center justify-center">
          <span className="text-2xl">📢</span>
        </div>
        <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
        <p className="text-xs text-gray-500 mb-4">{description}</p>
        <button
          onClick={handleClick}
          className="text-xs text-brand-primary font-medium hover:underline"
        >
          {ctaText}
        </button>
      </div>
    </div>
  )
}
