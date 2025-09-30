import { NextRequest, NextResponse } from 'next/server'
import { SparhamsterApiFetcher } from '@/lib/fetchers/sparhamster-api'
import { dealsCache, CACHE_KEYS } from '@/lib/cache'
import { createTranslationManager } from '@/lib/translation-setup'

// 创建翻译管理器单例
const translationManager = createTranslationManager({
  deepl: {
    apiKey: process.env.DEEPL_API_KEY || '1f7dff02-4dff-405f-94db-0d1ee398130f:fx',
    endpoint: process.env.DEEPL_ENDPOINT || 'https://api-free.deepl.com/v2'
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  routing: {
    primary: 'deepl',
    fallback: [],
    maxRetries: 3,
    cacheEnabled: true,
    cacheTTL: 3600 * 24 // 24小时
  }
})

// 创建 sparhamsterFetcher 实例（使用新的 API Fetcher）
const sparhamsterFetcher = new SparhamsterApiFetcher(translationManager)

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

    // 尝试从缓存获取数据
    let allDeals = dealsCache.get(CACHE_KEYS.RSS_DEALS)

    if (!allDeals) {
      console.log('Cache miss - Fetching live deals from Sparhamster.at...')

      // 获取真实数据（使用新的 API Fetcher）
      const result = await sparhamsterFetcher.fetchDeals({ limit: 20 })
      allDeals = result.deals

      // 缓存5分钟
      if (allDeals && Array.isArray(allDeals) && allDeals.length > 0) {
        dealsCache.set(CACHE_KEYS.RSS_DEALS, allDeals, 5)
        console.log(`🚀 Cached ${allDeals.length} deals for 5 minutes`)
      }
    } else {
      console.log('Cache hit - Using cached deals data')
    }

    if (!Array.isArray(allDeals) || allDeals.length === 0) {
      return NextResponse.json({
        deals: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
        filters: { category, search, sortBy, sortOrder },
        message: 'No deals found or unable to fetch from Sparhamster.at'
      })
    }

    console.log(`Fetched ${allDeals.length} deals from Sparhamster.at`)

    // 过滤数据
    let filteredDeals = [...allDeals]

    // 按分类过滤
    if (category && category !== 'all') {
      filteredDeals = filteredDeals.filter(deal =>
        deal.category.toLowerCase() === category.toLowerCase() ||
        deal.categories.some((cat: string) => cat.toLowerCase().includes(category.toLowerCase()))
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
        deal.source.toLowerCase().includes(searchLower) ||
        deal.categories.some((cat: string) => cat.toLowerCase().includes(searchLower))
      )
    }

    // 排序
    filteredDeals.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'price':
          aValue = parseFloat(a.price || '0')
          bValue = parseFloat(b.price || '0')
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
    const processedDeals = deals.map(deal => ({
      ...deal,
      isExpired: new Date(deal.expiresAt) < now,
      daysRemaining: Math.ceil((new Date(deal.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }))

    // 返回数据
    const response = {
      deals: processedDeals,
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
      source: allDeals === dealsCache.get(CACHE_KEYS.RSS_DEALS) ? 'Sparhamster.at (Cached)' : 'Sparhamster.at (Live)',
      fetchedAt: new Date().toISOString(),
      cached: allDeals === dealsCache.get(CACHE_KEYS.RSS_DEALS),
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching live deals:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch live deals from Sparhamster.at',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}