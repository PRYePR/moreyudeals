import { NextRequest, NextResponse } from 'next/server'
import { createModuleLogger } from '@/lib/logger'
import { dealsService } from '@/lib/services/deals-service'

const logger = createModuleLogger('api:categories')
const ALLOWED_SORT_FIELDS = new Set(['name', 'count', 'id'])

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const includeSubcategories = searchParams.get('subcategories') === 'true'
    const sortByParam = searchParams.get('sortBy') || 'count'
    const sortOrderParam = searchParams.get('sortOrder') || 'desc'

    const sortBy = ALLOWED_SORT_FIELDS.has(sortByParam) ? sortByParam : 'count'
    const sortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc'

    const summary = await dealsService.getCategories()

    // 复制数据以避免修改原始数据
    let processedCategories = [...summary.categories]

    // 排序
    processedCategories.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'name':
          aValue = (a.translatedName || a.name).toLowerCase()
          bValue = (b.translatedName || b.name).toLowerCase()
          break
        case 'count':
          aValue = a.count
          bValue = b.count
          break
        case 'id':
          aValue = a.id
          bValue = b.id
          break
        default:
          aValue = a.count
          bValue = b.count
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      } else {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
      }
    })

    // 如果不需要子分类，移除它们
    let finalCategories: typeof processedCategories = processedCategories
    if (!includeSubcategories) {
      finalCategories = processedCategories.map(({ subcategories, ...category }) => ({
        ...category,
        subcategories: []
      }))
    }

    const response = {
      categories: finalCategories,
      stats: {
        ...summary.stats
      },
      filters: {
        includeSubcategories,
        sortBy,
        sortOrder,
      },
      meta: {
        fetchedAt: summary.fetchedAt,
        cacheHit: summary.cacheHit
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Error fetching categories', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 获取单个分类的详细信息
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { categoryId } = body

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    const category = categories.find(cat => cat.id === categoryId)

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // 添加额外的分类详细信息
    const detailedCategory = {
      ...category,
      popularity: Math.floor(Math.random() * 100) + 1, // 模拟受欢迎程度
      averageDiscount: Math.floor(Math.random() * 50) + 10, // 模拟平均折扣
      lastUpdated: new Date().toISOString(),
      trendingDeals: 3, // 模拟热门优惠数量
    }

    return NextResponse.json(detailedCategory)

  } catch (error) {
    logger.error('Error fetching category details', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
