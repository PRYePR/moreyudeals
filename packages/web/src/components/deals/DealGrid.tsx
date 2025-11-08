import { Deal } from '@/lib/api-client/types'
import DealCard from './DealCard'

interface DealGridProps {
  deals: Deal[]
  loading?: boolean
}

function DealCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
      {/* Image skeleton */}
      <div className="w-full aspect-[16/9] bg-gray-200" />

      {/* Content skeleton */}
      <div className="p-4">
        <div className="h-4 w-20 bg-gray-200 rounded-full mb-2" />
        <div className="h-6 bg-gray-200 rounded mb-2" />
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
        <div className="h-4 bg-gray-200 rounded mb-2" />
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
        <div className="h-8 bg-gray-200 rounded mb-3" />
        <div className="flex justify-between">
          <div className="h-3 w-16 bg-gray-200 rounded" />
          <div className="h-3 w-20 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  )
}

export default function DealGrid({ deals, loading = false }: DealGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <DealCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <svg
          className="w-24 h-24 text-gray-300 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">暂无优惠</h3>
        <p className="text-gray-500 text-center max-w-md">
          当前没有符合条件的优惠信息，请尝试调整筛选条件或稍后再来查看。
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {deals.map((deal) => (
        <DealCard key={deal.id} deal={deal} />
      ))}
    </div>
  )
}
