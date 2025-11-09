import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * 获取搜索条件下的可用分类和商家
 * 用于实现搜索筛选联动：
 * - 分类：只显示有搜索结果的分类
 * - 商家：变灰禁用无搜索结果的商家
 *
 * 注意：此 API 只处理搜索相关的筛选
 * 分类和商家的联动由前端的 merchantByCategory 和 categoryByMerchant 处理
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const merchant = searchParams.get('merchant')
    const category = searchParams.get('category')

    // 如果没有搜索条件，返回空（前端会使用 merchantByCategory 处理）
    if (!search) {
      return NextResponse.json({
        availableCategories: [],
        allMerchants: []
      })
    }

    const baseUrl = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com'
      : 'http://localhost:3000'

    // 双向联动逻辑：
    // 1. 如果选择了商家 → 获取该商家在搜索条件下的分类
    // 2. 如果选择了分类 → 获取该分类在搜索条件下的商家
    // 3. 始终获取纯搜索条件下的所有商家（用于对比）

    const categoryParams = new URLSearchParams()
    categoryParams.set('search', search)
    if (merchant) categoryParams.set('merchant', merchant)

    const merchantParams = new URLSearchParams()
    merchantParams.set('search', search)
    if (category) merchantParams.set('category', category)

    // 获取当前筛选条件下的分类和商家统计，以及所有商家列表
    const [categoriesRes, merchantsRes, allMerchantsRes] = await Promise.all([
      fetch(`${baseUrl}/api/categories?${categoryParams.toString()}`, { cache: 'no-store' })
        .then(res => res.json())
        .catch(() => ({ categories: [] })),
      fetch(`${baseUrl}/api/merchants?${merchantParams.toString()}`, { cache: 'no-store' })
        .then(res => res.json())
        .catch(() => ({ merchants: [] })),
      // 获取所有商家（不带筛选条件）
      fetch(`${baseUrl}/api/merchants`, { cache: 'no-store' })
        .then(res => res.json())
        .catch(() => ({ merchants: [] }))
    ])

    const categories = categoriesRes.categories || []
    const merchants = merchantsRes.merchants || []
    const allMerchantsData = allMerchantsRes.merchants || []

    // 标准分类映射
    const categoryNameToId: Record<string, string> = {
      'gaming': 'gaming',
      'electronics': 'electronics',
      'elektronik': 'electronics',
      'computer': 'electronics',
      'fashion': 'fashion',
      'home & kitchen': 'home-kitchen',
      'haushalt': 'home-kitchen',
      'sports & outdoor': 'sports-outdoor',
      'freizeit': 'sports-outdoor',
      'beauty & health': 'beauty-health',
      'automotive': 'automotive',
      'food & drinks': 'food-drinks',
      'lebensmittel': 'food-drinks',
      'toys & kids': 'toys-kids',
      'spielzeug': 'toys-kids',
      'books & media': 'books-media',
      'pets': 'pets',
      'office': 'office',
      'garden': 'garden',
      'general': 'general',
      'schnäppchen': 'general',
      'sonstiges': 'general'
    }

    // 聚合分类数据
    const categoryMap = new Map<string, number>()
    categories.forEach((cat: any) => {
      const standardId = categoryNameToId[cat.name.toLowerCase()]
      if (standardId) {
        const count = categoryMap.get(standardId) || 0
        categoryMap.set(standardId, count + (cat.count || 0))
      }
    })

    // 转换为数组，只包含有结果的分类
    const availableCategories = Array.from(categoryMap.entries())
      .filter(([_, count]) => count > 0)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)

    // 处理商家数据：基于所有商家列表，标记当前筛选下哪些有结果
    const merchantsWithResultsMap = new Map<string, number>()
    merchants.forEach((m: any) => {
      const count = typeof m.deal_count === 'string' ? parseInt(m.deal_count) : m.deal_count
      merchantsWithResultsMap.set(m.merchant, count || 0)
    })

    // 返回所有商家，标记可用性
    const allMerchants = allMerchantsData.map((m: any) => {
      const totalCount = typeof m.deal_count === 'string' ? parseInt(m.deal_count) : m.deal_count
      const currentCount = merchantsWithResultsMap.get(m.merchant) || 0
      return {
        name: m.merchant,
        count: totalCount || 0, // 总商品数
        available: currentCount > 0 // 当前筛选条件下是否有结果
      }
    }).sort((a: any, b: any) => {
      // 有结果的排前面，然后按总商品数量排序
      if (a.available && !b.available) return -1
      if (!a.available && b.available) return 1
      return b.count - a.count
    })

    return NextResponse.json({
      availableCategories,
      allMerchants
    })
  } catch (error) {
    console.error('Error fetching search filters:', error)
    return NextResponse.json(
      {
        availableCategories: [],
        allMerchants: []
      },
      { status: 200 }
    )
  }
}
