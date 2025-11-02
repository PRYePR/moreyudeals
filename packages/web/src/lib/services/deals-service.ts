import type { Deal } from '../fetchers/types'
import { defaultCache, cacheKeys, CACHE_TTL } from '../cache'
import { createModuleLogger } from '../logger'
import { Deal as DbDeal } from '../db/types'
import { DealsRepository } from '../db/deals-repository'

const logger = createModuleLogger('service:deals')

const MAX_FETCH_LIMIT = 500
const ENV_LIMIT = Number(process.env.SPARHAMSTER_FETCH_LIMIT || '200')
const DATASET_LIMIT = Math.min(Math.max(Number.isNaN(ENV_LIMIT) ? 200 : ENV_LIMIT, 20), MAX_FETCH_LIMIT)

/**
 * Convert database Deal to fetcher Deal format
 */
function convertDbDealToFetcherDeal(dbDeal: DbDeal): Deal {
  return {
    id: dbDeal.id,
    title: dbDeal.title, // 已翻译的标题
    originalTitle: dbDeal.originalTitle || dbDeal.title, // 德语原标题
    translatedTitle: dbDeal.title, // 已翻译的标题
    description: dbDeal.description || '', // 已翻译的HTML描述
    price: dbDeal.price?.toString() || undefined,
    originalPrice: dbDeal.originalPrice?.toString() || undefined,
    currency: dbDeal.currency,
    discountPercentage: dbDeal.discount || undefined,
    imageUrl: dbDeal.imageUrl || '',
    dealUrl: dbDeal.merchantLink || dbDeal.fallbackLink || dbDeal.dealUrl || '',
    category: dbDeal.categories?.[0] || 'General',
    source: dbDeal.sourceSite,
    publishedAt: dbDeal.publishedAt,
    expiresAt: dbDeal.expiresAt || undefined,
    language: 'de' as const,
    translationProvider: 'deepl' as const,
    isTranslated: dbDeal.translationStatus === 'completed',
    categories: dbDeal.categories || [],
    content: dbDeal.description || dbDeal.contentHtml || '', // 优先使用翻译后的 HTML (description)，否则使用德语 HTML
    contentHtml: dbDeal.contentHtml || '', // 添加德语原文HTML
    translatedContentHtml: dbDeal.translatedContentHtml || '', // 添加翻译后的HTML

    // Extended fields
    wordpressId: dbDeal.sourcePostId ? parseInt(dbDeal.sourcePostId) : undefined,
    merchantName: dbDeal.canonicalMerchantName || dbDeal.merchant || undefined,
    merchantLogo: dbDeal.merchantLogo || undefined,
    tags: dbDeal.tags || [],
    featured: dbDeal.isFeatured,
    voucherCode: dbDeal.couponCode || undefined,

    // Link tracking
    affiliateUrl: dbDeal.affiliateUrl || undefined,
    originalUrl: dbDeal.fallbackLink || dbDeal.dealUrl || undefined,
    trackingUrl: dbDeal.merchantLink || undefined,
    merchantHomepage: dbDeal.merchant ? `https://${dbDeal.merchant}` : undefined
  }
}

interface DealsCacheEntry {
  deals: Deal[]
  fetchedAt: string
  source: string
}

export type DealSortField = 'price' | 'discount' | 'publishedAt' | 'expiresAt' | 'relevance'

export interface DealsListOptions {
  page?: number
  limit?: number
  category?: string
  merchant?: string
  search?: string
  sortBy?: DealSortField
  sortOrder?: 'asc' | 'desc'
  forceRefresh?: boolean
}

export interface DealsListResult {
  deals: Array<Deal & { isExpired: boolean; daysRemaining: number; relevanceScore?: number }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  filters: {
    category?: string | null
    merchant?: string | null
    search?: string | null
    sortBy: DealSortField
    sortOrder: 'asc' | 'desc'
  }
  meta: {
    fetchedAt: string
    source: string
    cacheHit: boolean
  }
}

export interface CategoriesSummary {
  categories: Array<{
    id: string
    name: string
    translatedName: string
    count: number
    icon?: string
    description?: string
    subcategories?: Array<{
      id: string
      name: string
      translatedName: string
      count: number
    }>
  }>
  stats: {
    totalDeals: number
    totalCategories: number
    totalSubcategories: number
  }
  fetchedAt: string
  cacheHit: boolean
}

const cacheKey = cacheKeys.allDeals()

function normaliseText(value?: string | null): string {
  if (!value) return ''
  return value.trim().toLowerCase()
}

function toNumber(value?: string): number {
  if (!value) return 0
  const parsed = parseFloat(value.replace(',', '.'))
  return Number.isNaN(parsed) ? 0 : parsed
}

function computeDaysRemaining(expiresAt: Date | undefined): number {
  if (!expiresAt) return 0 // 没有过期时间则返回 0
  const now = new Date()
  const diff = expiresAt.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return days < 0 ? 0 : days
}

function computeRelevanceScore(deal: Deal, query: string): number {
  const terms = query.split(/\s+/).filter(Boolean)
  if (terms.length === 0) return 0

  const textTargets = [
    { value: deal.translatedTitle, weight: 10 },
    { value: deal.originalTitle, weight: 8 },
    { value: deal.description, weight: 5 },
    { value: deal.category, weight: 6 },
    { value: deal.source, weight: 2 },
    { value: deal.merchantName ?? '', weight: 3 }
  ]

  const tagTargets = (deal.tags ?? []).map(tag => ({ value: tag, weight: 3 }))
  const allTargets = [...textTargets, ...tagTargets]

  let score = 0

  for (const term of terms) {
    const lowerTerm = term.toLowerCase()
    for (const target of allTargets) {
      if (!target.value) continue
      if (target.value.toLowerCase().includes(lowerTerm)) {
        score += target.weight
      }
    }
  }

  return score
}

function translateCategoryName(category: string): string {
  const mapping: Record<string, string> = {
    // 标准分类
    'gaming': '游戏娱乐',
    'electronics': '电子产品',
    'fashion': '时尚服饰',
    'home-kitchen': '家居厨房',
    'home & kitchen': '家居厨房',
    'home and kitchen': '家居厨房',
    'home &amp; kitchen': '家居厨房',
    'sports-outdoor': '运动户外',
    'sports & outdoor': '运动户外',
    'sports and outdoor': '运动户外',
    'beauty-health': '美妆护肤',
    'beauty & health': '美妆护肤',
    'beauty and health': '美妆护肤',
    'automotive': '汽车用品',
    'food-drinks': '食品饮料',
    'food & drinks': '食品饮料',
    'food and drinks': '食品饮料',
    'toys-kids': '玩具儿童',
    'toys & kids': '玩具儿童',
    'books-media': '图书影音',
    'books & media': '图书影音',
    'pets': '宠物用品',
    'office': '办公用品',
    'garden': '园艺花园',
    'general': '综合',

    // 兼容德语原始分类（Sparhamster）
    'computer': '电子产品',
    'elektronik': '电子产品',
    'mode': '时尚服饰',
    'kleidung': '时尚服饰',
    'haushalt': '家居厨房',
    'küche': '家居厨房',
    'sport': '运动户外',
    'fitness': '运动户外',
    'beauty': '美妆护肤',
    'gesundheit': '美妆护肤',
    'auto': '汽车用品',
    'kfz': '汽车用品',
    'lebensmittel': '食品饮料',
    'getränke': '食品饮料',
    'spielzeug': '玩具儿童',
    'kinder': '玩具儿童',
    'bücher': '图书影音',
    'medien': '图书影音',
    'haustiere': '宠物用品',
    'büro': '办公用品',
    'garten': '园艺花园',
    'schnäppchen': '综合',
  }

  const key = normaliseText(category)
  return mapping[key] || category
}

export class DealsService {
  private readonly datasetLimit: number
  private readonly repository: DealsRepository

  constructor(datasetLimit: number = DATASET_LIMIT) {
    this.datasetLimit = datasetLimit
    this.repository = new DealsRepository()
  }

  async getDeals(options: DealsListOptions = {}): Promise<DealsListResult> {
    const page = Math.max(options.page ?? 1, 1)
    const limit = Math.min(Math.max(options.limit ?? 12, 1), 100)
    const sortBy: DealSortField = options.sortBy ?? (options.search ? 'relevance' : 'publishedAt')
    const sortOrder: 'asc' | 'desc' = options.sortOrder ?? 'desc'
    const searchTerm = normaliseText(options.search ?? '')
    const categoryFilter = normaliseText(options.category ?? '')
    const merchantFilter = normaliseText(options.merchant ?? '')

    const { entry, cacheHit } = await this.loadDeals(options.forceRefresh === true)
    let workingList = [...entry.deals]

    if (categoryFilter && categoryFilter !== 'all') {
      // 获取该标准分类的关键词
      const keywords = this.getCategoryKeywords(categoryFilter)

      workingList = workingList.filter(deal => {
        const mainCategory = normaliseText(deal.category)
        const allCategories = [mainCategory, ...(deal.categories ?? []).map(normaliseText)]

        // 检查优惠的分类是否匹配任一关键词
        return allCategories.some(cat => keywords.includes(cat))
      })
    }

    if (merchantFilter) {
      workingList = workingList.filter(deal => {
        const dealMerchant = normaliseText(deal.merchantName ?? '')
        return dealMerchant === merchantFilter
      })
    }

    let relevanceScores: Map<string, number> | null = null
    if (searchTerm) {
      workingList = workingList.filter(deal => {
        const fields = [
          deal.translatedTitle,
          deal.originalTitle,
          deal.description,
          deal.category,
          deal.source,
          deal.merchantName ?? '',
          ...(deal.tags ?? [])
        ].map(value => value.toLowerCase())

        return fields.some(value => value.includes(searchTerm))
      })

      relevanceScores = new Map(
        workingList.map(deal => [deal.id, computeRelevanceScore(deal, searchTerm)])
      )
    }

    workingList.sort((a, b) => {
      let aValue: number | string = 0
      let bValue: number | string = 0

      switch (sortBy) {
        case 'price':
          aValue = toNumber(a.price)
          bValue = toNumber(b.price)
          break
        case 'discount':
          aValue = a.discountPercentage ?? 0
          bValue = b.discountPercentage ?? 0
          break
        case 'expiresAt':
          // 没有过期时间的排在最后（使用最大时间戳）
          aValue = a.expiresAt ? new Date(a.expiresAt).getTime() : Number.MAX_SAFE_INTEGER
          bValue = b.expiresAt ? new Date(b.expiresAt).getTime() : Number.MAX_SAFE_INTEGER
          break
        case 'relevance':
          aValue = relevanceScores?.get(a.id) ?? 0
          bValue = relevanceScores?.get(b.id) ?? 0
          break
        case 'publishedAt':
        default:
          aValue = new Date(a.publishedAt).getTime()
          bValue = new Date(b.publishedAt).getTime()
          break
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return sortOrder === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })

    const total = workingList.length
    const totalPages = Math.max(Math.ceil(total / limit), 1)
    const safePage = Math.min(page, totalPages)
    const startIndex = (safePage - 1) * limit
    const endIndex = startIndex + limit
    const pageItems = workingList.slice(startIndex, endIndex)

    const preparedDeals = pageItems.map(deal => {
      const expiresAt = deal.expiresAt ? new Date(deal.expiresAt) : undefined
      const daysRemaining = computeDaysRemaining(expiresAt)
      const relevanceScore = relevanceScores?.get(deal.id)

      return {
        ...deal,
        isExpired: expiresAt ? expiresAt.getTime() < Date.now() : false, // 没有过期时间则不过期
        daysRemaining,
        relevanceScore
      }
    })

    return {
      deals: preparedDeals,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
        hasNext: safePage < totalPages,
        hasPrev: safePage > 1
      },
      filters: {
        category: options.category ?? null,
        merchant: options.merchant ?? null,
        search: options.search ?? null,
        sortBy,
        sortOrder
      },
      meta: {
        fetchedAt: entry.fetchedAt,
        source: entry.source,
        cacheHit
      }
    }
  }

  async getDealById(id: string, opts: { forceRefresh?: boolean; fromDatabase?: boolean } = {}): Promise<Deal | null> {
    // 如果指定从数据库读取，使用 repository
    if (opts.fromDatabase) {
      const dbDeal = await this.repository.getDealById(id)
      if (!dbDeal) {
        return null
      }
      // 转换 DB Deal 到 Fetcher Deal 格式
      return convertDbDealToFetcherDeal(dbDeal)
    }

    // 否则从缓存读取
    const { entry } = await this.loadDeals(opts.forceRefresh === true)
    const match = entry.deals.find(deal => deal.id === id || deal.wordpressId?.toString() === id)

    if (match) {
      return match
    }

    const { entry: refreshedEntry } = await this.loadDeals(true)
    return refreshedEntry.deals.find(deal => deal.id === id || deal.wordpressId?.toString() === id) ?? null
  }

  async getCategories(): Promise<CategoriesSummary> {
    const { entry, cacheHit } = await this.loadDeals(false)

    // 定义标准分类（与 packages/shared 中的定义保持一致）
    const standardCategories = [
      { id: 'gaming', name: 'Gaming', translatedName: '游戏娱乐', icon: 'gamepad' },
      { id: 'electronics', name: 'Electronics', translatedName: '电子产品', icon: 'laptop' },
      { id: 'fashion', name: 'Fashion', translatedName: '时尚服饰', icon: 'shirt' },
      { id: 'home-kitchen', name: 'Home & Kitchen', translatedName: '家居厨房', icon: 'home' },
      { id: 'sports-outdoor', name: 'Sports & Outdoor', translatedName: '运动户外', icon: 'bike' },
      { id: 'beauty-health', name: 'Beauty & Health', translatedName: '美妆护肤', icon: 'heart' },
      { id: 'automotive', name: 'Automotive', translatedName: '汽车用品', icon: 'car' },
      { id: 'food-drinks', name: 'Food & Drinks', translatedName: '食品饮料', icon: 'utensils' },
      { id: 'toys-kids', name: 'Toys & Kids', translatedName: '玩具儿童', icon: 'baby' },
      { id: 'books-media', name: 'Books & Media', translatedName: '图书影音', icon: 'book' },
      { id: 'pets', name: 'Pets', translatedName: '宠物用品', icon: 'paw' },
      { id: 'office', name: 'Office', translatedName: '办公用品', icon: 'briefcase' },
      { id: 'garden', name: 'Garden', translatedName: '园艺花园', icon: 'leaf' },
      { id: 'general', name: 'General', translatedName: '综合', icon: 'tag' },
    ]

    // 统计每个标准分类的优惠数量
    const categoryCounts = new Map<string, number>()

    for (const deal of entry.deals) {
      // 尝试映射原始分类到标准分类
      const originalCategory = normaliseText(deal.category || 'general')
      const allCategories = [originalCategory, ...(deal.categories || []).map(normaliseText)]

      // 查找匹配的标准分类
      let matched = false
      for (const stdCat of standardCategories) {
        const keywords = this.getCategoryKeywords(stdCat.id)

        for (const cat of allCategories) {
          if (keywords.includes(cat)) {
            categoryCounts.set(stdCat.id, (categoryCounts.get(stdCat.id) || 0) + 1)
            matched = true
            break
          }
        }
        if (matched) break
      }

      // 如果没有匹配，归类到 general
      if (!matched) {
        categoryCounts.set('general', (categoryCounts.get('general') || 0) + 1)
      }
    }

    // 构建分类列表
    const categories = standardCategories.map(stdCat => ({
      id: stdCat.id,
      name: stdCat.name,
      translatedName: stdCat.translatedName,
      icon: stdCat.icon,
      description: undefined,
      count: categoryCounts.get(stdCat.id) || 0,
      subcategories: []
    }))

    // 按优惠数量排序（保留有优惠的分类在前）
    categories.sort((a, b) => b.count - a.count)

    const totalDeals = entry.deals.length
    const totalCategories = categories.filter(c => c.count > 0).length

    return {
      categories,
      stats: {
        totalDeals,
        totalCategories,
        totalSubcategories: 0
      },
      fetchedAt: entry.fetchedAt,
      cacheHit
    }
  }

  // 获取分类的关键词（用于匹配）
  private getCategoryKeywords(categoryId: string): string[] {
    const keywordMap: Record<string, string[]> = {
      'gaming': ['gaming', 'spiele', 'konsolen', 'playstation', 'xbox', 'nintendo'],
      'electronics': ['electronics', 'elektronik', 'computer', 'laptop', 'smartphone', 'handy', 'tv', 'fernseher'],
      'fashion': ['fashion', 'mode', 'kleidung', 'schuhe'],
      'home-kitchen': ['home', 'kitchen', 'haushalt', 'küche', 'möbel'],
      'sports-outdoor': ['sport', 'sports', 'outdoor', 'fitness', 'fahrrad', 'bike'],
      'beauty-health': ['beauty', 'health', 'gesundheit', 'kosmetik', 'pflege'],
      'automotive': ['automotive', 'auto', 'kfz', 'car'],
      'food-drinks': ['food', 'drinks', 'lebensmittel', 'getränke'],
      'toys-kids': ['toys', 'kids', 'spielzeug', 'kinder', 'baby'],
      'books-media': ['books', 'media', 'bücher', 'medien', 'musik'],
      'pets': ['pets', 'haustiere', 'tierbedarf'],
      'office': ['office', 'büro', 'schreibwaren'],
      'garden': ['garden', 'garten'],
      'general': ['general', 'allgemein', 'schnäppchen', 'sonstiges'],
    }

    return keywordMap[categoryId] || []
  }

  async getMerchants(): Promise<Array<{ name: string; count: number }>> {
    const { entry } = await this.loadDeals(false)
    const merchantCounts = new Map<string, number>()

    for (const deal of entry.deals) {
      if (deal.merchantName) {
        merchantCounts.set(
          deal.merchantName,
          (merchantCounts.get(deal.merchantName) || 0) + 1
        )
      }
    }

    return Array.from(merchantCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count) // 按数量降序排序
  }

  /**
   * Get cross-filtering data for categories and merchants
   * Returns the count of deals for each category-merchant combination
   */
  async getCategoryMerchantCrossFilters(): Promise<{
    categoryByMerchant: Map<string, Map<string, number>>  // merchant -> category -> count
    merchantByCategory: Map<string, Map<string, number>>  // category -> merchant -> count
  }> {
    const { entry } = await this.loadDeals(false)

    // merchant -> category -> count
    const categoryByMerchant = new Map<string, Map<string, number>>()
    // category -> merchant -> count
    const merchantByCategory = new Map<string, Map<string, number>>()

    // 定义标准分类列表（与 getCategories 保持一致）
    const standardCategories = [
      'gaming', 'electronics', 'fashion', 'home-kitchen', 'sports-outdoor',
      'beauty-health', 'automotive', 'food-drinks', 'toys-kids', 'books-media',
      'pets', 'office', 'garden', 'general'
    ]

    for (const deal of entry.deals) {
      const merchantName = deal.merchantName
      if (!merchantName) continue

      // 找到该 deal 所属的标准分类
      const originalCategory = normaliseText(deal.category || 'general')
      const allCategories = [originalCategory, ...(deal.categories || []).map(normaliseText)]

      // 查找匹配的标准分类
      let matchedCategories = new Set<string>()
      for (const stdCat of standardCategories) {
        const keywords = this.getCategoryKeywords(stdCat)
        for (const cat of allCategories) {
          if (keywords.includes(cat)) {
            matchedCategories.add(stdCat)
            break
          }
        }
      }

      // 如果没有匹配，归类到 general
      if (matchedCategories.size === 0) {
        matchedCategories.add('general')
      }

      // 更新统计数据
      for (const categoryId of matchedCategories) {
        // Update categoryByMerchant
        if (!categoryByMerchant.has(merchantName)) {
          categoryByMerchant.set(merchantName, new Map())
        }
        const categoryMap = categoryByMerchant.get(merchantName)!
        categoryMap.set(categoryId, (categoryMap.get(categoryId) || 0) + 1)

        // Update merchantByCategory
        if (!merchantByCategory.has(categoryId)) {
          merchantByCategory.set(categoryId, new Map())
        }
        const merchantMap = merchantByCategory.get(categoryId)!
        merchantMap.set(merchantName, (merchantMap.get(merchantName) || 0) + 1)
      }
    }

    return {
      categoryByMerchant,
      merchantByCategory
    }
  }

  private async loadDeals(forceRefresh: boolean): Promise<{ entry: DealsCacheEntry; cacheHit: boolean }> {
    if (!forceRefresh) {
      const cached = await defaultCache.get<DealsCacheEntry>(cacheKey)
      if (cached) {
        logger.debug('Loaded deals from cache', { count: cached.deals.length })
        return { entry: cached, cacheHit: true }
      }
    }

    const fresh = await this.fetchFreshDeals(this.datasetLimit)
    await defaultCache.set(cacheKey, fresh, CACHE_TTL.DEALS_LIST)
    logger.info('Fetched fresh deals dataset', {
      count: fresh.deals.length,
      fetchedAt: fresh.fetchedAt
    })

    return { entry: fresh, cacheHit: false }
  }

  private async fetchFreshDeals(limit: number): Promise<DealsCacheEntry> {
    const safeLimit = Math.min(Math.max(limit, 20), MAX_FETCH_LIMIT)

    // Query database instead of WordPress API
    const dealsRepo = new DealsRepository()
    const result = await dealsRepo.getDeals({
      limit: safeLimit,
      page: 1,
      sortBy: 'latest'
    })

    // Convert database deals to fetcher format
    const convertedDeals = result.deals.map(convertDbDealToFetcherDeal)

    logger.info('Fetched deals from database', {
      count: convertedDeals.length,
      limit: safeLimit
    })

    return {
      deals: convertedDeals,
      fetchedAt: new Date().toISOString(),
      source: 'Database (PostgreSQL)'
    }
  }
}

export const dealsService = new DealsService()
