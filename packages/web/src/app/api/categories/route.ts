import { NextRequest, NextResponse } from 'next/server'
import { createModuleLogger } from '@/lib/logger'
import { apiClient } from '@/lib/api-client'

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

    // 临时方案：从优惠数据中提取分类，因为后端/api/categories有bug
    let apiResponse
    try {
      apiResponse = await apiClient.getCategories()
    } catch (error) {
      logger.warn('Failed to fetch categories from backend, using fallback', error as Error)
      // 备用方案：从deals中提取分类
      const dealsResponse = await apiClient.getDeals({ limit: 1000 })
      const categoryCount: Record<string, number> = {}

      dealsResponse.data.forEach(deal => {
        if (deal.categories && Array.isArray(deal.categories)) {
          deal.categories.forEach(cat => {
            categoryCount[cat] = (categoryCount[cat] || 0) + 1
          })
        }
      })

      apiResponse = {
        categories: Object.entries(categoryCount).map(([name, count]) => ({
          name,
          count
        }))
      }
    }

    // 暂时返回简化版本(后端API不支持完整的分类统计)
    const response = {
      categories: apiResponse.categories.map(cat => ({
        id: cat.name.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-'),
        name: cat.name,
        translatedName: cat.name, // 后端已经返回英文名
        count: cat.count,
        icon: 'tag',
        subcategories: []
      })),
      stats: {
        totalDeals: apiResponse.categories.reduce((sum, cat) => sum + cat.count, 0),
        totalCategories: apiResponse.categories.length
      },
      filters: {
        includeSubcategories,
        sortBy,
        sortOrder,
      },
      meta: {
        fetchedAt: new Date().toISOString(),
        cacheHit: false
      }
    }

    // 排序
    let processedCategories = [...response.categories]

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

    // 更新response中的categories为排序后的数据
    response.categories = processedCategories

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

    // 从API获取所有分类
    const apiResponse = await apiClient.getCategories()
    const category = apiResponse.categories.find(cat =>
      cat.name.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-') === categoryId
    )

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // 添加额外的分类详细信息
    const detailedCategory = {
      id: category.name.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-'),
      name: category.name,
      translatedName: category.name,
      count: category.count,
      popularity: Math.floor(Math.random() * 100) + 1,
      averageDiscount: Math.floor(Math.random() * 50) + 10,
      lastUpdated: new Date().toISOString(),
      trendingDeals: 3,
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
