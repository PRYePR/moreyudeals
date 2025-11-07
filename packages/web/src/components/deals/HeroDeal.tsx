import Image from 'next/image'
import Link from 'next/link'
import { Deal } from '@/lib/db/types'

interface HeroDealProps {
  deal: Deal
}

export default function HeroDeal({ deal }: HeroDealProps) {
  const formatPrice = (price: number | null, currency: string) => {
    if (!price) return null
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(price)
  }

  const savings = deal.originalPrice && deal.price
    ? deal.originalPrice - deal.price
    : null

  const altText = (deal.titleZh || deal.title || '精选优惠') as string

  return (
    <div className="relative w-full bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl overflow-hidden shadow-2xl">
      <div className="grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Content */}
        <div className="p-8 lg:p-12 text-white z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-semibold text-sm">精选优惠</span>
          </div>

          {/* Title - 优先显示中文翻译 */}
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">
            {deal.titleZh || deal.title}
          </h2>

          {/* Description - 优先显示中文翻译 */}
          {(deal.descriptionZh || deal.description) && (
            <p className="text-white/90 text-lg mb-6 line-clamp-3">
              {deal.descriptionZh || deal.description}
            </p>
          )}

          {/* Price Section */}
          <div className="mb-8">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-5xl font-bold">
                {formatPrice(deal.price, deal.currency)}
              </span>
              {deal.originalPrice && deal.originalPrice > (deal.price || 0) && (
                <span className="text-2xl text-white/70 line-through">
                  {formatPrice(deal.originalPrice, deal.currency)}
                </span>
              )}
            </div>
            {savings && (
              <p className="text-white/90">
                立省 <span className="font-bold text-xl">{formatPrice(savings, deal.currency)}</span>
              </p>
            )}
          </div>

          {/* Discount Badge */}
          {deal.discount && deal.discount > 0 && (
            <div className="inline-block mb-6">
              <div className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold text-xl shadow-lg">
                节省 {deal.discount}%
              </div>
            </div>
          )}

          {/* CTA Button */}
          <Link
            href={`/deals/${deal.id}`}
            className="inline-flex items-center gap-2 bg-white text-primary-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all duration-200 hover:scale-105 shadow-lg"
          >
            查看详情
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>

          {/* Merchant Info */}
          {deal.merchant && (
            <div className="mt-6 flex items-center gap-2 text-white/80">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="text-sm">来自 {deal.merchant}</span>
            </div>
          )}
        </div>

        {/* Right Side - Image */}
        <div className="relative h-64 lg:h-96">
          {deal.imageUrl ? (
            <Image
              src={deal.imageUrl}
              alt={altText}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            <div className="w-full h-full bg-primary-500/30 flex items-center justify-center">
              <svg className="w-32 h-32 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Merchant Logo Overlay */}
          {deal.merchantLogo && (
            <div className="absolute bottom-4 right-4 bg-white rounded-lg p-2 shadow-xl">
              <Image
                src={deal.merchantLogo}
                alt={deal.merchant || 'Merchant'}
                width={60}
                height={60}
                className="object-contain"
              />
            </div>
          )}
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-800/30 rounded-full translate-y-48 -translate-x-48 blur-3xl" />
    </div>
  )
}
