import { NextRequest, NextResponse } from 'next/server'

// 模拟搜索数据
const mockDeals = [
  {
    id: '1',
    title: 'Samsung Galaxy S24 Ultra - Exklusiver Rabatt',
    originalTitle: 'Samsung Galaxy S24 Ultra - Exklusiver Rabatt',
    translatedTitle: 'Samsung Galaxy S24 Ultra - 独家折扣',
    description: 'Sparen Sie 200€ beim Kauf des neuen Samsung Galaxy S24 Ultra.',
    originalDescription: 'Sparen Sie 200€ beim Kauf des neuen Samsung Galaxy S24 Ultra.',
    translatedDescription: '购买新款Samsung Galaxy S24 Ultra可节省200欧元。',
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
    tags: ['Samsung', 'Smartphone', 'Android', '5G'],
  },
  {
    id: '2',
    title: 'Adidas Sneaker Sale',
    originalTitle: 'Adidas Sneaker Sale',
    translatedTitle: 'Adidas运动鞋促销',
    description: 'Bis zu 50% Rabatt auf ausgewählte Adidas Sneaker.',
    originalDescription: 'Bis zu 50% Rabatt auf ausgewählte Adidas Sneaker.',
    translatedDescription: '精选Adidas运动鞋最高可享受50%的折扣。',
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
    tags: ['Adidas', 'Sneaker', 'Fashion', 'Sport'],
  },
  {
    id: '5',
    title: 'iPhone 15 Pro Max - Neues Jahr Angebot',
    originalTitle: 'iPhone 15 Pro Max - Neues Jahr Angebot',
    translatedTitle: 'iPhone 15 Pro Max - 新年优惠',
    description: 'Apple iPhone 15 Pro Max mit 256GB Speicher. Jetzt 10% günstiger.',
    originalDescription: 'Apple iPhone 15 Pro Max mit 256GB Speicher. Jetzt 10% günstiger.',
    translatedDescription: '配备256GB存储的Apple iPhone 15 Pro Max。现在便宜10%。',
    price: '1199.99',
    originalPrice: '1329.99',
    currency: 'EUR',
    discountPercentage: 10,
    imageUrl: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-max-naturaltitanium-select.png',
    dealUrl: 'https://example-german-store.de/iphone-15-pro-max',
    category: 'Electronics',
    source: 'Apple Store DE',
    publishedAt: '2024-01-16T08:00:00Z',
    expiresAt: '2024-02-28T23:59:59Z',
    language: 'de',
    translationProvider: 'deepl',
    isTranslated: true,
    tags: ['iPhone', 'Apple', 'Smartphone', 'iOS'],
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const query = searchParams.get('q')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'relevance'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

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

    const searchQuery = query.trim().toLowerCase()

    // 搜索逻辑
    let searchResults = mockDeals.filter(deal => {
      const searchableFields = [
        deal.translatedTitle,
        deal.originalTitle,
        deal.translatedDescription,
        deal.originalDescription,
        deal.category,
        deal.source,
        ...deal.tags
      ].map(field => field.toLowerCase())

      return searchableFields.some(field =>
        field.includes(searchQuery)
      )
    })

    // 按分类过滤
    if (category && category !== 'all') {
      searchResults = searchResults.filter(deal =>
        deal.category.toLowerCase() === category.toLowerCase()
      )
    }

    // 计算相关度分数
    const searchResultsWithScore = searchResults.map(deal => {
      let relevanceScore = 0

      // 标题匹配权重最高
      if (deal.translatedTitle.toLowerCase().includes(searchQuery)) {
        relevanceScore += 10
      }
      if (deal.originalTitle.toLowerCase().includes(searchQuery)) {
        relevanceScore += 8
      }

      // 描述匹配
      if (deal.translatedDescription.toLowerCase().includes(searchQuery)) {
        relevanceScore += 5
      }
      if (deal.originalDescription.toLowerCase().includes(searchQuery)) {
        relevanceScore += 4
      }

      // 分类匹配
      if (deal.category.toLowerCase().includes(searchQuery)) {
        relevanceScore += 6
      }

      // 标签匹配
      deal.tags.forEach(tag => {
        if (tag.toLowerCase().includes(searchQuery)) {
          relevanceScore += 3
        }
      })

      // 来源匹配
      if (deal.source.toLowerCase().includes(searchQuery)) {
        relevanceScore += 2
      }

      return {
        ...deal,
        relevanceScore
      }
    })

    // 排序
    searchResultsWithScore.sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return sortOrder === 'asc'
            ? a.relevanceScore - b.relevanceScore
            : b.relevanceScore - a.relevanceScore
        case 'price':
          const aPrice = parseFloat(a.price)
          const bPrice = parseFloat(b.price)
          return sortOrder === 'asc' ? aPrice - bPrice : bPrice - aPrice
        case 'discount':
          const aDiscount = a.discountPercentage || 0
          const bDiscount = b.discountPercentage || 0
          return sortOrder === 'asc' ? aDiscount - bDiscount : bDiscount - aDiscount
        case 'publishedAt':
          const aDate = new Date(a.publishedAt).getTime()
          const bDate = new Date(b.publishedAt).getTime()
          return sortOrder === 'asc' ? aDate - bDate : bDate - aDate
        default:
          return b.relevanceScore - a.relevanceScore
      }
    })

    // 分页
    const total = searchResultsWithScore.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const deals = searchResultsWithScore.slice(startIndex, endIndex)

    // 添加过期检查
    const now = new Date()
    const processedDeals = deals.map(deal => ({
      ...deal,
      isExpired: new Date(deal.expiresAt) < now,
      daysRemaining: Math.ceil((new Date(deal.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }))

    // 搜索建议
    const suggestions = generateSearchSuggestions(searchQuery, mockDeals)

    // 返回结果
    const response = {
      query: searchQuery,
      deals: processedDeals,
      suggestions,
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
        sortBy,
        sortOrder,
      },
      searchTime: Date.now(),
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error searching deals:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 生成搜索建议
function generateSearchSuggestions(query: string, deals: any[]) {
  const allTerms = new Set<string>()

  deals.forEach(deal => {
    // 收集所有可能的搜索词
    const words = [
      ...deal.translatedTitle.split(' '),
      ...deal.originalTitle.split(' '),
      ...deal.tags,
      deal.category,
      deal.source
    ]

    words.forEach(word => {
      if (word.length > 2 && word.toLowerCase().includes(query.toLowerCase())) {
        allTerms.add(word)
      }
    })
  })

  return Array.from(allTerms)
    .filter(term => term.toLowerCase() !== query.toLowerCase())
    .slice(0, 5)
}