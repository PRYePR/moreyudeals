import DealsListClient from '@/components/deals/DealsListClient'
import SiteHeader from '@/components/layout/SiteHeader'

const PAGE_SIZE = 20

async function getDealsData(searchParams: { [key: string]: string | string[] | undefined }) {
  try {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com'
      : 'http://localhost:3000'

    // 构建查询参数
    const params = new URLSearchParams()
    params.set('page', '1')
    params.set('limit', PAGE_SIZE.toString())

    // 添加筛选参数
    if (searchParams.merchant && typeof searchParams.merchant === 'string') {
      params.set('merchant', searchParams.merchant)
    }
    if (searchParams.category && typeof searchParams.category === 'string') {
      params.set('category', searchParams.category)
    }
    if (searchParams.search && typeof searchParams.search === 'string') {
      params.set('search', searchParams.search)
    }

    // 获取初始数据
    const response = await fetch(`${baseUrl}/api/deals/live?${params.toString()}`, {
      cache: 'no-store',
      next: { revalidate: 0 }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch deals')
    }

    const data = await response.json()

    return {
      deals: data.deals || [],
      totalCount: data.pagination?.total || 0
    }
  } catch (error) {
    console.error('Error fetching deals:', error)
    return {
      deals: [],
      totalCount: 0
    }
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const { deals, totalCount } = await getDealsData(params)

  return (
    <div className="min-h-screen bg-neutral-bg">
      {/* 使用新的 Header */}
      <SiteHeader />

      {/* Hero Section - Moreyu v3.1 配色 */}
      <section className="bg-gradient-to-br from-brand-primary via-brand-hover to-brand-primary text-white py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6">
              奥地利优惠信息聚合
            </h1>
            <p className="text-lg md:text-xl text-primary-100 max-w-2xl mx-auto">
              自动收集并翻译奥地利商家最新折扣信息，让你不错过任何好deal
            </p>
          </div>
        </div>
      </section>

      {/* Deals Grid Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Section Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            最新优惠
          </h2>
          <span className="text-sm text-gray-500">
            共 {totalCount} 个优惠
          </span>
        </div>

        {/* 使用客户端组件处理分页和加载更多 */}
        <DealsListClient
          initialDeals={deals}
          totalCount={totalCount}
          initialPage={1}
          pageSize={PAGE_SIZE}
        />
      </section>

      {/* Stats Section - 简化版 */}
      <section className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-brand-primary mb-2">
                {totalCount}+
              </div>
              <div className="text-sm md:text-base text-gray-600">实时优惠</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-brand-primary mb-2">
                50+
              </div>
              <div className="text-sm md:text-base text-gray-600">合作商家</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-brand-primary mb-2">
                每日
              </div>
              <div className="text-sm md:text-base text-gray-600">自动更新</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-brand-primary mb-2">
                中文
              </div>
              <div className="text-sm md:text-base text-gray-600">AI翻译</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm">
            <p>&copy; 2025 Moreyudeals. 奥地利优惠信息聚合平台</p>
            <p className="mt-2">
              数据来源于公开渠道 | 由 AI 自动翻译 | 仅供参考
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
