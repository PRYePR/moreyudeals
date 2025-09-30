import DealCard from '@/components/DealCard'
import SearchBar from '@/components/SearchBar'
import TranslationDisclaimer from '@/components/TranslationDisclaimer'

async function getLatestDeals() {
  try {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://your-domain.com'
      : 'http://localhost:3000'

    const response = await fetch(`${baseUrl}/api/deals/live?limit=6`, {
      cache: 'no-store' // 确保获取最新数据
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

// 备用模拟数据
const fallbackDeals = [
  {
    id: '1',
    title: 'Samsung Galaxy S24 Ultra - Exklusiver Rabatt',
    originalTitle: 'Samsung Galaxy S24 Ultra - Exklusiver Rabatt',
    translatedTitle: 'Samsung Galaxy S24 Ultra - 独家折扣',
    description: 'Sparen Sie 200€ beim Kauf des neuen Samsung Galaxy S24 Ultra. Limitiertes Angebot nur für kurze Zeit verfügbar.',
    originalDescription: 'Sparen Sie 200€ beim Kauf des neuen Samsung Galaxy S24 Ultra. Limitiertes Angebot nur für kurze Zeit verfügbar.',
    translatedDescription: '购买新款Samsung Galaxy S24 Ultra可节省200欧元。限时优惠，数量有限。',
    price: '899.99',
    originalPrice: '1099.99',
    currency: 'EUR',
    discountPercentage: 18,
    imageUrl: 'https://images.samsung.com/is/image/samsung/assets/de/smartphones/galaxy-s24/images/galaxy-s24-ultra_highlights_design.jpg',
    dealUrl: 'https://example-german-store.de/samsung-galaxy-s24-ultra',
    category: 'Electronics',
    source: 'DealNews DE',
    publishedAt: new Date('2024-01-15'),
    expiresAt: new Date('2024-02-15'),
    language: 'de' as const,
    translationProvider: 'deepl' as const,
    isTranslated: true,
  },
  {
    id: '2',
    title: 'Adidas Sneaker Sale',
    originalTitle: 'Adidas Sneaker Sale',
    translatedTitle: 'Adidas运动鞋促销',
    description: 'Bis zu 50% Rabatt auf ausgewählte Adidas Sneaker. Große Auswahl verfügbar.',
    originalDescription: 'Bis zu 50% Rabatt auf ausgewählte Adidas Sneaker. Große Auswahl verfügbar.',
    translatedDescription: '精选Adidas运动鞋最高可享受50%的折扣。款式丰富，选择多样。',
    price: '59.99',
    originalPrice: '119.99',
    currency: 'EUR',
    discountPercentage: 50,
    imageUrl: 'https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/placeholder.jpg',
    dealUrl: 'https://example-german-store.de/adidas-sneaker-sale',
    category: 'Fashion',
    source: 'MyDealz',
    publishedAt: new Date('2024-01-14'),
    expiresAt: new Date('2024-01-31'),
    language: 'de' as const,
    translationProvider: 'deepl' as const,
    isTranslated: true,
  },
  {
    id: '3',
    title: 'KitchenAid Mixer - Winterschlussverkauf',
    originalTitle: 'KitchenAid Mixer - Winterschlussverkauf',
    translatedTitle: 'KitchenAid搅拌器 - 冬季清仓特卖',
    description: 'Professioneller KitchenAid Stand Mixer mit 40% Nachlass. Perfekt für Hobby-Bäcker.',
    originalDescription: 'Professioneller KitchenAid Stand Mixer mit 40% Nachlass. Perfekt für Hobby-Bäcker.',
    translatedDescription: '专业KitchenAid台式搅拌器，享受40%折扣。非常适合烘焙爱好者。',
    price: '299.99',
    originalPrice: '499.99',
    currency: 'EUR',
    discountPercentage: 40,
    imageUrl: 'https://www.kitchenaid.de/is/image/content/dam/business-unit/kitchenaid/en-us/marketing-content/site-assets/page-content/pinch-of-help/how-to-use-kitchenaid-stand-mixer/how-to-use-kitchenaid-stand-mixer_banner_mobile.jpg',
    dealUrl: 'https://example-german-store.de/kitchenaid-mixer-sale',
    category: 'Home & Kitchen',
    source: 'Chefkoch Deals',
    publishedAt: new Date('2024-01-13'),
    expiresAt: new Date('2024-02-29'),
    language: 'de' as const,
    translationProvider: 'deepl' as const,
    isTranslated: true,
  },
]

export default async function HomePage() {
  const deals = await getLatestDeals()
  const displayDeals = deals.length > 0 ? deals : fallbackDeals
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              奥地利优惠信息聚合
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100">
              自动收集并翻译奥地利商家最新折扣信息
            </p>
            <div className="max-w-2xl mx-auto">
              <SearchBar />
            </div>
          </div>
        </div>
      </section>

      {/* Translation Disclaimer */}
      <TranslationDisclaimer />

      {/* Featured Deals Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              精选优惠
            </h2>
            <a
              href="/deals"
              className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              查看全部 →
            </a>
          </div>

          <div className="deals-grid">
            {displayDeals.map((deal: any) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>

          {deals.length > 0 && (
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                数据来源: {deals[0]?.source} | 最后更新: {new Date().toLocaleString('zh-CN')}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              平台数据
            </h2>
            <p className="text-gray-600">
              实时更新的奥地利优惠信息统计
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">{deals.length || 10}</div>
              <div className="text-gray-600">实时优惠</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">1</div>
              <div className="text-gray-600">数据来源</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">
                {deals.reduce((total: number, deal: any) => {
                  const discount = deal.discountPercentage || 0
                  return total + discount
                }, 0)}%
              </div>
              <div className="text-gray-600">总节省比例</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">实时</div>
              <div className="text-gray-600">数据同步</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            热门分类
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[
              { name: '电子产品', icon: '📱', count: 234 },
              { name: '时尚服饰', icon: '👕', count: 189 },
              { name: '家居用品', icon: '🏠', count: 156 },
              { name: '运动户外', icon: '⚽', count: 145 },
              { name: '美妆护肤', icon: '💄', count: 98 },
              { name: '食品饮料', icon: '🍕', count: 87 },
            ].map((category, index) => (
              <a
                key={index}
                href={`/categories/${category.name.toLowerCase()}`}
                className="bg-white rounded-lg p-6 text-center hover:shadow-lg transition-shadow duration-300 border border-gray-200"
              >
                <div className="text-3xl mb-3">{category.icon}</div>
                <div className="font-semibold text-gray-900 mb-1">{category.name}</div>
                <div className="text-sm text-gray-500">{category.count} 个优惠</div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}