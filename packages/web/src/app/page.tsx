import DealCardPreisjaeger from '@/components/deals/DealCardPreisjaeger'
import SiteHeader from '@/components/layout/SiteHeader'

async function getLatestDeals() {
  try {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com'
      : 'http://localhost:3000'

    const response = await fetch(`${baseUrl}/api/deals/live?limit=12`, {
      cache: 'no-store',
      next: { revalidate: 0 }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch deals')
    }

    const data = await response.json()
    return data.deals || []
  } catch (error) {
    console.error('Error fetching deals:', error)
    return []
  }
}

// 备用示例数据
const fallbackDeals = [
  {
    id: '1',
    title: 'Samsung Galaxy S24 Ultra - Exklusiver Rabatt',
    translatedTitle: 'Samsung Galaxy S24 Ultra - 独家折扣',
    imageUrl: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&q=80',
    price: 899.99,
    originalPrice: 1099.99,
    currency: 'EUR',
    discount: 18,
    merchant: 'Amazon',
    merchantLogo: '/logos/amazon.svg',
    dealUrl: 'https://example.com/samsung-s24',
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'Electronics',
  },
  {
    id: '2',
    title: 'Adidas Sneaker Sale',
    translatedTitle: 'Adidas运动鞋促销',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
    price: 59.99,
    originalPrice: 119.99,
    currency: 'EUR',
    discount: 50,
    merchant: 'Adidas',
    dealUrl: 'https://example.com/adidas-sneaker',
    publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'Fashion',
  },
  {
    id: '3',
    title: 'KitchenAid Mixer - Winterschlussverkauf',
    translatedTitle: 'KitchenAid搅拌器 - 冬季清仓',
    imageUrl: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&q=80',
    price: 299.99,
    originalPrice: 499.99,
    currency: 'EUR',
    discount: 40,
    merchant: 'Media Markt',
    dealUrl: 'https://example.com/kitchenaid',
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'Home & Kitchen',
  },
  {
    id: '4',
    title: 'Sony WH-1000XM5 Kopfhörer',
    translatedTitle: 'Sony WH-1000XM5 降噪耳机',
    imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80',
    price: 349.00,
    originalPrice: 429.00,
    currency: 'EUR',
    discount: 19,
    merchant: 'Saturn',
    dealUrl: 'https://example.com/sony-headphones',
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    category: 'Electronics',
  },
  {
    id: '5',
    title: 'Lego Star Wars Set',
    translatedTitle: '乐高星球大战套装',
    imageUrl: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&q=80',
    price: 89.99,
    originalPrice: 129.99,
    currency: 'EUR',
    discount: 31,
    merchant: 'MyToys',
    dealUrl: 'https://example.com/lego',
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'Toys',
  },
  {
    id: '6',
    title: 'Dyson V15 Staubsauger',
    translatedTitle: 'Dyson V15 吸尘器',
    imageUrl: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&q=80',
    price: 549.00,
    originalPrice: 749.00,
    currency: 'EUR',
    discount: 27,
    merchant: 'Expert',
    dealUrl: 'https://example.com/dyson',
    publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'Home Appliances',
  },
]

export default async function HomePage() {
  const deals = await getLatestDeals()
  const displayDeals = deals.length > 0 ? deals : fallbackDeals

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
            共 {displayDeals.length} 个优惠
          </span>
        </div>

        {/* Responsive Grid - Preisjaeger 风格 */}
        <div className="space-y-4">
          {displayDeals.map((deal: any) => (
            <DealCardPreisjaeger key={deal.id} deal={deal} />
          ))}
        </div>

        {/* Empty State */}
        {displayDeals.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">暂无优惠信息</p>
            <p className="text-gray-400 text-sm mt-2">请稍后再试</p>
          </div>
        )}
      </section>

      {/* Stats Section - 简化版 */}
      <section className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-brand-primary mb-2">
                {displayDeals.length}+
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
