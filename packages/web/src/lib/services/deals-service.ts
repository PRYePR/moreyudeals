import { SparhamsterApiFetcher } from '../fetchers/sparhamster-api'
import type { Deal } from '../fetchers/types'
import { defaultCache, cacheKeys, CACHE_TTL } from '../cache'
import { createModuleLogger } from '../logger'
import { createTranslationManager } from '../translation-setup'

const logger = createModuleLogger('service:deals')

const MAX_FETCH_LIMIT = 100
const ENV_LIMIT = Number(process.env.SPARHAMSTER_FETCH_LIMIT || '60')
const DATASET_LIMIT = Math.min(Math.max(Number.isNaN(ENV_LIMIT) ? 60 : ENV_LIMIT, 20), MAX_FETCH_LIMIT)

const translationManager = createTranslationManager({
  deepl: process.env.DEEPL_API_KEY
    ? {
        apiKey: process.env.DEEPL_API_KEY,
        endpoint: process.env.DEEPL_ENDPOINT || 'https://api-free.deepl.com/v2'
      }
    : undefined,
  redis: process.env.REDIS_URL
    ? {
        url: process.env.REDIS_URL
      }
    : undefined,
  routing: {
    primary: 'deepl',
    fallback: [],
    cacheEnabled: true,
    cacheTTL: 24 * 60 * 60
  }
})

const sparhamsterFetcher = new SparhamsterApiFetcher(translationManager)

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
    translatedDescription?: string
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

function computeDaysRemaining(expiresAt: Date): number {
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
    { value: deal.translatedDescription, weight: 5 },
    { value: deal.originalDescription, weight: 4 },
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
    'electronics': '电子产品',
    'fashion': '时尚服饰',
    'home & kitchen': '家居用品',
    'home and kitchen': '家居用品',
    'home &amp; kitchen': '家居用品',
    'gaming': '游戏娱乐',
    'sports & outdoor': '运动户外',
    'sports and outdoor': '运动户外',
    'beauty & health': '美妆护肤',
    'beauty and health': '美妆护肤',
    'automotive': '汽车用品',
    'food & drinks': '食品饮料',
    'food and drinks': '食品饮料',
    'general': '综合'
  }

  const key = normaliseText(category)
  return mapping[key] || category
}

export class DealsService {
  private readonly datasetLimit: number

  constructor(datasetLimit: number = DATASET_LIMIT) {
    this.datasetLimit = datasetLimit
  }

  async getDeals(options: DealsListOptions = {}): Promise<DealsListResult> {
    const page = Math.max(options.page ?? 1, 1)
    const limit = Math.min(Math.max(options.limit ?? 12, 1), 100)
    const sortBy: DealSortField = options.sortBy ?? (options.search ? 'relevance' : 'publishedAt')
    const sortOrder: 'asc' | 'desc' = options.sortOrder ?? 'desc'
    const searchTerm = normaliseText(options.search ?? '')
    const categoryFilter = normaliseText(options.category ?? '')

    const { entry, cacheHit } = await this.loadDeals(options.forceRefresh === true)
    let workingList = [...entry.deals]

    if (categoryFilter && categoryFilter !== 'all') {
      workingList = workingList.filter(deal => {
        const mainCategory = normaliseText(deal.category)
        const extraCategories = (deal.categories ?? []).map(normaliseText)
        return mainCategory === categoryFilter || extraCategories.includes(categoryFilter)
      })
    }

    let relevanceScores: Map<string, number> | null = null
    if (searchTerm) {
      workingList = workingList.filter(deal => {
        const fields = [
          deal.translatedTitle,
          deal.originalTitle,
          deal.translatedDescription,
          deal.originalDescription,
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
          aValue = new Date(a.expiresAt).getTime()
          bValue = new Date(b.expiresAt).getTime()
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
      const expiresAt = new Date(deal.expiresAt)
      const daysRemaining = computeDaysRemaining(expiresAt)
      const relevanceScore = relevanceScores?.get(deal.id)

      return {
        ...deal,
        isExpired: expiresAt.getTime() < Date.now(),
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

  async getDealById(id: string, opts: { forceRefresh?: boolean } = {}): Promise<Deal | null> {
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
    const categoryMap = new Map<string, { count: number; translatedName: string }>()
    const subcategoryMap = new Map<string, Map<string, number>>()

    for (const deal of entry.deals) {
      const mainKey = normaliseText(deal.category || 'General')
      const translated = translateCategoryName(deal.category || 'General')

      const mainEntry = categoryMap.get(mainKey) ?? { count: 0, translatedName: translated }
      mainEntry.count += 1
      categoryMap.set(mainKey, mainEntry)

      const secondaryCategories = deal.categories ?? []
      if (secondaryCategories.length > 0) {
        if (!subcategoryMap.has(mainKey)) {
          subcategoryMap.set(mainKey, new Map())
        }
        const bucket = subcategoryMap.get(mainKey)!
        for (const subcat of secondaryCategories) {
          const subKey = normaliseText(subcat)
          bucket.set(subKey, (bucket.get(subKey) ?? 0) + 1)
        }
      }
    }

    const categories = Array.from(categoryMap.entries()).map(([key, info]) => {
      const readableName = key
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')

      const subcategoriesRaw = Array.from(subcategoryMap.get(key)?.entries() ?? [])
      const subcategories = subcategoriesRaw
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([subKey, count]) => {
          const originalName = subKey
            .split('-')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
          return {
            id: subKey,
            name: originalName,
            translatedName: translateCategoryName(originalName),
            count
          }
        })

      return {
        id: key || 'general',
        name: readableName,
        translatedName: info.translatedName,
        description: undefined,
        translatedDescription: undefined,
        icon: undefined,
        count: info.count,
        subcategories
      }
    })

    categories.sort((a, b) => b.count - a.count)

    const totalDeals = entry.deals.length
    const totalCategories = categories.length
    const totalSubcategories = categories.reduce((sum, category) => sum + (category.subcategories?.length ?? 0), 0)

    return {
      categories,
      stats: {
        totalDeals,
        totalCategories,
        totalSubcategories
      },
      fetchedAt: entry.fetchedAt,
      cacheHit
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

    const result = await sparhamsterFetcher.fetchDeals({
      limit: safeLimit,
      page: 1
    })

    return {
      deals: result.deals,
      fetchedAt: result.fetchedAt.toISOString(),
      source: result.source
    }
  }
}

export const dealsService = new DealsService()
