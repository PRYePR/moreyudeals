import { NextRequest, NextResponse } from 'next/server'
import { createModuleLogger } from '@/lib/logger'
import { dealsService, type DealSortField } from '@/lib/services/deals-service'

const logger = createModuleLogger('api:deals')

const ALLOWED_SORT_FIELDS: DealSortField[] = ['price', 'discount', 'publishedAt', 'expiresAt', 'relevance']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // 获取查询参数
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const sortByParam = searchParams.get('sortBy')
    const sortOrderParam = searchParams.get('sortOrder')

    const sortBy = sortByParam && ALLOWED_SORT_FIELDS.includes(sortByParam as DealSortField)
      ? (sortByParam as DealSortField)
      : undefined
    const sortOrder = sortOrderParam === 'asc' ? 'asc' : sortOrderParam === 'desc' ? 'desc' : undefined

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

    const result = await dealsService.getDeals({
      page,
      limit,
      category: category ?? undefined,
      search: search ?? undefined,
      sortBy,
      sortOrder
    })

    return NextResponse.json({
      deals: result.deals,
      pagination: result.pagination,
      filters: result.filters,
      meta: result.meta
    })

  } catch (error) {
    logger.error('Error fetching deals', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
