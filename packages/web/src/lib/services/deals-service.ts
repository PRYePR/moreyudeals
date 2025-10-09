import { defaultCache, cacheKeys, CACHE_TTL } from '../cache'
import { createModuleLogger } from '../logger'
import {
  fetchRecentDeals,
  fetchDealByIdentifier,
  DealRow
} from '../data/deals-repository'
import type { Deal } from '../fetchers/types'

const logger = createModuleLogger('service:deals')

export type DealSortField = 'price' | 'discount' | 'publishedAt' | 'expiresAt' | 'relevance'

export interface DealsListOptions {
  page?: number
  limit?: number
  category?: string
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
    search?: string | null
    sortBy: DealSortField
    sortOrder: 'asc' | 'desc'
  }
  meta: {
    fetchedAt: string
    cacheHit: boolean
  }
}

export interface CategoriesSummary {
  categories: Array<{
    id: string
    name: string
    translatedName: string
    count: number
    subcategories: Array<{
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

interface DatasetCacheEntry {
  deals: Deal[]
  fetchedAt: string
}

// ---- Domain mapping helpers ------------------------------------------------

const loggerContext = { module: 'service:deals' }

function parseCategories(value: any): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.map(String)
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.map(String)
    }
  } catch {
    // ignore
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
  return []
}

function normalizePrice(value: any): string | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'number') return value.toFixed(2)
  if (typeof value === 'string') {
    const numeric = Number(value.replace(',', '.'))
    if (!Number.isNaN(numeric)) {
      return numeric.toFixed(2)
    }
    return value
  }
  return undefined
}

function mapRowToDeal(row: DealRow): Deal {
  const categories = parseCategories((row as any).categories)
  const publishedAt = row.pub_date ? new Date(row.pub_date) : new Date(row.created_at)
  const fallbackExpiry = new Date(publishedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
  const expiresAt = row.expires_at ? new Date(row.expires_at) : fallbackExpiry

  const translatedTitle = row.title || row.original_title || ''
  const translatedDescription = row.description || row.original_description || ''

  const contentText = (row as any).content_text || row.original_description || ''
  const contentHtml = (row as any).content_html || undefined

  return {
    id: String(row.id),
    title: translatedTitle,
    originalTitle: row.original_title || translatedTitle,
    translatedTitle: translatedTitle,
    description: translatedDescription,
    originalDescription: row.original_description || translatedDescription,
    translatedDescription: translatedDescription,
    price: normalizePrice(row.price),
    originalPrice: normalizePrice(row.original_price),
    currency: row.currency || 'EUR',
    discountPercentage: row.discount !== null && row.discount !== undefined
      ? Number(row.discount)
      : undefined,
    imageUrl: row.image_url || '',
    dealUrl: row.link,
    category: categories[0] || 'General',
    source: (row as any).source || 'Sparhamster.at',
    publishedAt,
    expiresAt,
    language: ((row.translation_language as any) || 'de') as Deal['language'],
    translationProvider: ((row.translation_provider as any) || 'deepl') as Deal['translationProvider'],
    isTranslated: row.is_translated ?? translatedDescription !== row.original_description,
    categories,
    content: contentText || translatedDescription,
    contentHtml,
    merchantName: (row as any).merchant_name || undefined,
    merchantLogo: (row as any).merchant_logo || undefined,
    tags: parseCategories((row as any).tags),
    affiliateUrl: (row as any).affiliate_url || undefined,
    originalUrl: row.link
  }
}

function computeRelevanceScore(deal: Deal, query: string): number {
  const terms = query
    .split(/\s+/)
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean)

  if (terms.length === 0) return 0

  const textTargets = [
    { value: deal.translatedTitle, weight: 10 },
    { value: deal.originalTitle, weight: 8 },
    { value: deal.translatedDescription, weight: 5 },
    { value: deal.originalDescription, weight: 4 },
    { value: deal.category, weight: 6 },
    { value: deal.source, weight: 2 },
    { value: deal.merchantName ?? '', weight: 3 }
  ]

  const tagTargets = (deal.tags ?? []).map((tag) => ({ value: tag, weight: 3 }))
  const allTargets = [...textTargets, ...tagTargets]

  let score = 0

  for (const term of terms) {
    for (const target of allTargets) {
      if (!target.value) continue
      if (target.value.toLowerCase().includes(term)) {
        score += target.weight
      }
    }
  }

  return score
}

function computeDaysRemaining(expiresAt: Date): number {
  const now = new Date()
  const diff = expiresAt.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return days < 0 ? 0 : days
}

// ---- Service implementation -------------------------------------------------

class DealsService {
  private datasetCacheKey = cacheKeys.allDeals()

  async getDeals(options: DealsListOptions = {}): Promise<DealsListResult> {
    const page = Math.max(options.page ?? 1, 1)
    const limit = Math.min(Math.max(options.limit ?? 12, 1), 100)
    const sortBy: DealSortField = options.sortBy ?? (options.search ? 'relevance' : 'publishedAt')
    const sortOrder: 'asc' | 'desc' = options.sortOrder ?? 'desc'
    const searchTerm = (options.search ?? '').trim().toLowerCase()
    const categoryFilter = (options.category ?? '').trim().toLowerCase()

    const { deals, cacheHit, fetchedAt } = await this.loadDataset(options.forceRefresh === true)
    let workingList = [...deals]

    if (categoryFilter && categoryFilter !== 'all') {
      workingList = workingList.filter((deal) => {
        const mainCategory = deal.category.toLowerCase()
        const extraCategories = deal.categories.map((cat) => cat.toLowerCase())
        return mainCategory === categoryFilter || extraCategories.includes(categoryFilter)
      })
    }

    let relevanceScores: Map<string, number> | null = null
    if (searchTerm) {
      workingList = workingList.filter((deal) => {
        const fields = [
          deal.translatedTitle,
          deal.originalTitle,
          deal.translatedDescription,
          deal.originalDescription,
          deal.category,
          deal.source,
          deal.merchantName ?? '',
          ...(deal.tags ?? [])
        ].map((value) => value.toLowerCase())

        return fields.some((value) => value.includes(searchTerm))
      })

      relevanceScores = new Map(
        workingList.map((deal) => [deal.id, computeRelevanceScore(deal, searchTerm)])
      )
    }

    workingList.sort((a, b) => {
      let aValue: number
      let bValue: number

      switch (sortBy) {
        case 'price':
          aValue = Number(a.price || 0)
          bValue = Number(b.price || 0)
          break
        case 'discount':
          aValue = a.discountPercentage ?? 0
          bValue = b.discountPercentage ?? 0
          break
        case 'expiresAt':
          aValue = a.expiresAt.getTime()
          bValue = b.expiresAt.getTime()
          break
        case 'relevance':
          aValue = relevanceScores?.get(a.id) ?? 0
          bValue = relevanceScores?.get(b.id) ?? 0
          break
        case 'publishedAt':
        default:
          aValue = a.publishedAt.getTime()
          bValue = b.publishedAt.getTime()
      }

      return sortOrder === 'asc'
        ? aValue - bValue
        : bValue - aValue
    })

    const total = workingList.length
    const totalPages = Math.max(Math.ceil(total / limit), 1)
    const safePage = Math.min(page, totalPages)
    const startIndex = (safePage - 1) * limit
    const endIndex = startIndex + limit

    const paginatedDeals = workingList.slice(startIndex, endIndex).map((deal) => {
      const daysRemaining = computeDaysRemaining(deal.expiresAt)
      const relevanceScore = relevanceScores?.get(deal.id)

      return {
        ...deal,
        isExpired: daysRemaining === 0 && new Date(deal.expiresAt) < new Date(),
        daysRemaining,
        relevanceScore
      }
    })

    return {
      deals: paginatedDeals,
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
        search: options.search ?? null,
        sortBy,
        sortOrder
      },
      meta: {
        fetchedAt,
        cacheHit
      }
    }
  }

  async getDealById(id: string, opts: { forceRefresh?: boolean } = {}): Promise<Deal | null> {
    const { deals } = await this.loadDataset(opts.forceRefresh === true)
    const match = deals.find((deal) => deal.id === id || deal.originalUrl === id)
    if (match) return match

    const row = await fetchDealByIdentifier(id)
    return row ? mapRowToDeal(row) : null
  }

  async getCategories(): Promise<CategoriesSummary> {
    const { deals, cacheHit, fetchedAt } = await this.loadDataset(false)

    const categoryMap = new Map<string, number>()
    const subCategoryMap = new Map<string, Map<string, number>>()

    for (const deal of deals) {
      const main = deal.category
      categoryMap.set(main, (categoryMap.get(main) || 0) + 1)

      if (deal.categories.length > 1) {
        if (!subCategoryMap.has(main)) {
          subCategoryMap.set(main, new Map())
        }
        const bucket = subCategoryMap.get(main)!
        for (const sub of deal.categories.slice(1)) {
          bucket.set(sub, (bucket.get(sub) || 0) + 1)
        }
      }
    }

    const categories = Array.from(categoryMap.entries())
      .map(([name, count]) => ({
        id: name.toLowerCase(),
        name,
        translatedName: translateCategory(name),
        count,
        subcategories: Array.from(subCategoryMap.get(name)?.entries() ?? [])
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([sub, subCount]) => ({
            id: sub.toLowerCase(),
            name: sub,
            translatedName: translateCategory(sub),
            count: subCount
          }))
      }))
      .sort((a, b) => b.count - a.count)

    const totalDeals = deals.length
    const totalCategories = categories.length
    const totalSubcategories = categories.reduce(
      (sum, category) => sum + category.subcategories.length,
      0
    )

    return {
      categories,
      stats: {
        totalDeals,
        totalCategories,
        totalSubcategories
      },
      fetchedAt,
      cacheHit
    }
  }

  private async loadDataset(forceRefresh: boolean): Promise<{ deals: Deal[]; cacheHit: boolean; fetchedAt: string }> {
    if (!forceRefresh) {
      const cached = await defaultCache.get<DatasetCacheEntry>(this.datasetCacheKey)
      if (cached) {
        logger.debug('Loaded deals dataset from cache', { count: cached.deals.length }, loggerContext)
        return { deals: cached.deals, cacheHit: true, fetchedAt: cached.fetchedAt }
      }
    }

    const rows = await fetchRecentDeals()
    const deals = rows.map(mapRowToDeal)
    const fetchedAt = new Date().toISOString()

    const cacheEntry: DatasetCacheEntry = { deals, fetchedAt }
    await defaultCache.set(this.datasetCacheKey, cacheEntry, CACHE_TTL.DEALS_LIST)

    logger.info('Fetched deals dataset from database', { count: deals.length }, loggerContext)

    return { deals, cacheHit: false, fetchedAt }
  }
}

function translateCategory(category: string): string {
  const mapping: Record<string, string> = {
    'electronics': '电子产品',
    'fashion': '时尚服饰',
    'home & kitchen': '家居用品',
    'home and kitchen': '家居用品',
    'gaming': '游戏娱乐',
    'sports': '运动户外',
    'sports & outdoor': '运动户外',
    'beauty': '美妆护肤',
    'beauty & health': '美妆护肤',
    'automotive': '汽车用品',
    'food': '食品饮料',
    'general': '综合'
  }

  const key = category.trim().toLowerCase()
  return mapping[key] || category
}

export const dealsService = new DealsService()
