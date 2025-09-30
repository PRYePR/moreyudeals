import { NextRequest, NextResponse } from 'next/server'

// 模拟数据库连接（稍后将连接到实际的PostgreSQL数据库）
const mockDeals = [
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
    publishedAt: '2024-01-15T10:00:00Z',
    expiresAt: '2024-02-15T23:59:59Z',
    language: 'de',
    translationProvider: 'deepl',
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
    publishedAt: '2024-01-14T15:30:00Z',
    expiresAt: '2024-01-31T23:59:59Z',
    language: 'de',
    translationProvider: 'deepl',
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
    publishedAt: '2024-01-13T09:15:00Z',
    expiresAt: '2024-02-29T23:59:59Z',
    language: 'de',
    translationProvider: 'deepl',
    isTranslated: true,
  },
  {
    id: '4',
    title: 'Nintendo Switch OLED - Preissenkung',
    originalTitle: 'Nintendo Switch OLED - Preissenkung',
    translatedTitle: 'Nintendo Switch OLED - 降价促销',
    description: 'Nintendo Switch OLED Konsole jetzt 15% günstiger. Inklusive Mario Kart 8 Deluxe.',
    originalDescription: 'Nintendo Switch OLED Konsole jetzt 15% günstiger. Inklusive Mario Kart 8 Deluxe.',
    translatedDescription: 'Nintendo Switch OLED游戏机现在便宜15%。包含马里奥赛车8豪华版。',
    price: '289.99',
    originalPrice: '339.99',
    currency: 'EUR',
    discountPercentage: 15,
    imageUrl: 'https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/ncom/software/switch/70010000012332/switch_mario_kart_8_deluxe_02.jpg',
    dealUrl: 'https://example-german-store.de/nintendo-switch-oled',
    category: 'Gaming',
    source: 'GameDeals DE',
    publishedAt: '2024-01-12T14:20:00Z',
    expiresAt: '2024-01-25T23:59:59Z',
    language: 'de',
    translationProvider: 'deepl',
    isTranslated: true,
  },
  {
    id: '5',
    title: 'Dyson V15 Detect - Staubsauger Angebot',
    originalTitle: 'Dyson V15 Detect - Staubsauger Angebot',
    translatedTitle: 'Dyson V15 Detect - 吸尘器优惠',
    description: 'Kabelloser Staubsauger mit Laser-Technologie. 30% Rabatt bei ausgewählten Händlern.',
    originalDescription: 'Kabelloser Staubsauger mit Laser-Technologie. 30% Rabatt bei ausgewählten Händlern.',
    translatedDescription: '配备激光技术的无线吸尘器。精选经销商提供30%折扣。',
    price: '419.99',
    originalPrice: '599.99',
    currency: 'EUR',
    discountPercentage: 30,
    imageUrl: 'https://dyson-h.assetsadobe2.com/is/image/content/dam/dyson/images/products/primary/399552-01.png',
    dealUrl: 'https://example-german-store.de/dyson-v15-detect',
    category: 'Home & Kitchen',
    source: 'TechDeals',
    publishedAt: '2024-01-11T11:45:00Z',
    expiresAt: '2024-02-10T23:59:59Z',
    language: 'de',
    translationProvider: 'deepl',
    isTranslated: true,
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // 获取查询参数
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'publishedAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // 验证参数
    if (page < 1) {
      return NextResponse.json(
        { error: 'Page must be greater than 0' },
        { status: 400 }
      )
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      )
    }

    // 过滤数据
    let filteredDeals = [...mockDeals]

    // 按分类过滤
    if (category && category !== 'all') {
      filteredDeals = filteredDeals.filter(deal =>
        deal.category.toLowerCase() === category.toLowerCase()
      )
    }

    // 按搜索词过滤
    if (search) {
      const searchLower = search.toLowerCase()
      filteredDeals = filteredDeals.filter(deal =>
        deal.translatedTitle.toLowerCase().includes(searchLower) ||
        deal.originalTitle.toLowerCase().includes(searchLower) ||
        deal.translatedDescription.toLowerCase().includes(searchLower) ||
        deal.originalDescription.toLowerCase().includes(searchLower) ||
        deal.category.toLowerCase().includes(searchLower) ||
        deal.source.toLowerCase().includes(searchLower)
      )
    }

    // 排序
    filteredDeals.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'price':
          aValue = parseFloat(a.price)
          bValue = parseFloat(b.price)
          break
        case 'discount':
          aValue = a.discountPercentage || 0
          bValue = b.discountPercentage || 0
          break
        case 'publishedAt':
          aValue = new Date(a.publishedAt).getTime()
          bValue = new Date(b.publishedAt).getTime()
          break
        case 'expiresAt':
          aValue = new Date(a.expiresAt).getTime()
          bValue = new Date(b.expiresAt).getTime()
          break
        default:
          aValue = new Date(a.publishedAt).getTime()
          bValue = new Date(b.publishedAt).getTime()
      }

      if (sortOrder === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })

    // 分页
    const total = filteredDeals.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const deals = filteredDeals.slice(startIndex, endIndex)

    // 添加过期检查
    const now = new Date()
    const activeDeals = deals.map(deal => ({
      ...deal,
      isExpired: new Date(deal.expiresAt) < now,
      daysRemaining: Math.ceil((new Date(deal.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }))

    // 返回数据
    const response = {
      deals: activeDeals,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      filters: {
        category,
        search,
        sortBy,
        sortOrder,
      },
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching deals:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}