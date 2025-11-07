import { NextRequest, NextResponse } from 'next/server'
import { createModuleLogger } from '@/lib/logger'
import { apiClient, convertApiDealsToDeals } from '@/lib/api-client'

const logger = createModuleLogger('api:deals:live')

// 映射sortBy字段名(前端 -> 后端API)
function mapSortField(sortBy?: string): 'created_at' | 'price' | 'discount' | 'published_at' | 'expires_at' | undefined {
  const mapping: Record<string, 'created_at' | 'price' | 'discount' | 'published_at' | 'expires_at'> = {
    'price': 'price',
    'discount': 'discount',
    'publishedAt': 'published_at',
    'expiresAt': 'expires_at',
    'relevance': 'created_at',
  }
  return sortBy ? mapping[sortBy] : undefined
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // 获取查询参数
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const category = searchParams.get('category')
    const merchant = searchParams.get('merchant')
    const search = searchParams.get('search')
    const sortByParam = searchParams.get('sortBy')
    const sortOrderParam = searchParams.get('sortOrder')

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

    // 调用后端API
    const apiResponse = await apiClient.getDeals({
      page,
      limit,
      category: category || undefined,
      merchant: merchant || undefined,
      search: search || undefined,
      sort: mapSortField(sortByParam || undefined),
      order: sortOrderParam === 'asc' ? 'ASC' : sortOrderParam === 'desc' ? 'DESC' : 'DESC',
    })

    // 转换API数据为前端Deal格式 (后端返回data字段,不是deals)
    const deals = convertApiDealsToDeals(apiResponse.data)

    // 构造分页信息,添加hasNext和hasPrev
    const pagination = {
      ...apiResponse.pagination,
      hasNext: apiResponse.pagination.page < apiResponse.pagination.totalPages,
      hasPrev: apiResponse.pagination.page > 1
    }

    return NextResponse.json({
      deals,
      pagination,
      filters: apiResponse.filters,
      source: 'API Server',
      fetchedAt: new Date().toISOString(),
    })

  } catch (error) {
    logger.error('Error fetching deals from API', error as Error)
    return NextResponse.json(
      {
        error: 'Failed to fetch deals from API server',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
