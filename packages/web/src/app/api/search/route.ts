import { NextRequest, NextResponse } from 'next/server'
import { createModuleLogger } from '@/lib/logger'
import { dealsService, type DealSortField } from '@/lib/services/deals-service'

const logger = createModuleLogger('api:search')

const ALLOWED_SORT_FIELDS: DealSortField[] = ['relevance', 'price', 'discount', 'publishedAt', 'expiresAt']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startedAt = Date.now()

    const query = searchParams.get('q')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const category = searchParams.get('category')
    const sortByParam = searchParams.get('sortBy')
    const sortOrderParam = searchParams.get('sortOrder')

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

    const sortBy = sortByParam && ALLOWED_SORT_FIELDS.includes(sortByParam as DealSortField)
      ? (sortByParam as DealSortField)
      : undefined
    const sortOrder = sortOrderParam === 'asc' ? 'asc' : sortOrderParam === 'desc' ? 'desc' : undefined

    const result = await dealsService.getDeals({
      page,
      limit,
      category: category ?? undefined,
      search: query,
      sortBy,
      sortOrder
    })

    // 搜索建议从更多匹配中提取（限制较大以覆盖常见词）
    const suggestionPoolLimit = Math.max(limit, 30)
    const suggestionPool = await dealsService.getDeals({
      page: 1,
      limit: suggestionPoolLimit,
      category: category ?? undefined,
      search: query,
      sortBy: 'relevance',
      sortOrder: 'desc'
    })

    const suggestions = generateSearchSuggestions(query, suggestionPool.deals)
    const searchTime = Date.now() - startedAt

    // 返回结果
    const response = {
      query: query.trim(),
      deals: result.deals,
      suggestions,
      pagination: result.pagination,
      filters: result.filters,
      meta: result.meta,
      searchTime
    }

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Error searching deals', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 生成搜索建议
function generateSearchSuggestions(
  query: string,
  deals: Array<{
    translatedTitle: string
    originalTitle: string
    category: string
    source: string
    merchantName?: string
    tags?: string[]
  }>
) {
  const allTerms = new Set<string>()
  const lowerQuery = query.trim().toLowerCase()

  deals.forEach(deal => {
    const words = [
      ...deal.translatedTitle.split(/\s+/),
      ...deal.originalTitle.split(/\s+/),
      ...(deal.tags ?? []),
      deal.category,
      deal.source,
      deal.merchantName ?? ''
    ]

    words.forEach(word => {
      const token = word.trim()
      if (
        token.length > 2 &&
        token.toLowerCase().includes(lowerQuery) &&
        token.toLowerCase() !== lowerQuery
      ) {
        allTerms.add(token)
      }
    })
  })

  return Array.from(allTerms)
    .slice(0, 5)
}
