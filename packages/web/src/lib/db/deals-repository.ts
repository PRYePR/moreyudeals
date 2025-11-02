/**
 * Deals repository - Database access layer for deals table
 */

import { query } from './connection'
import { Deal, DealRow, mapRowToDeal } from './types'
import { cache, cacheKeys, CACHE_TTL } from './cache'

export interface DealsListOptions {
  page?: number
  limit?: number
  category?: string
  merchant?: string
  search?: string
  sortBy?: 'latest' | 'price_asc' | 'price_desc' | 'discount'
  minPrice?: number
  maxPrice?: number
  minDiscount?: number
}

export interface DealsListResult {
  deals: Deal[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  filters: DealsListOptions
  meta: {
    fetchedAt: string
    source: string
    cacheHit: boolean
  }
}

export interface CategoriesResult {
  categories: Array<{
    name: string
    count: number
  }>
  fetchedAt: string
  cacheHit: boolean
}

export class DealsRepository {
  /**
   * Get deals list with filtering, pagination, and sorting
   */
  async getDeals(options: DealsListOptions = {}): Promise<DealsListResult> {
    const page = Math.max(options.page || 1, 1)
    const limit = Math.min(Math.max(options.limit || 20, 1), 500)
    const offset = (page - 1) * limit

    // Try cache first
    const cacheKey = cacheKeys.dealsList(options)
    const cached = await cache.get<DealsListResult>(cacheKey)
    if (cached) {
      return {
        ...cached,
        meta: { ...cached.meta, cacheHit: true },
      }
    }

    // Build SQL query
    const conditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    // Filter by category (JSONB array contains)
    if (options.category) {
      conditions.push(`categories @> $${paramIndex}::jsonb`)
      params.push(JSON.stringify([options.category]))
      paramIndex++
    }

    // Filter by merchant
    if (options.merchant) {
      conditions.push(`merchant = $${paramIndex}`)
      params.push(options.merchant)
      paramIndex++
    }

    // Filter by price range
    if (options.minPrice !== undefined) {
      conditions.push(`price >= $${paramIndex}`)
      params.push(options.minPrice)
      paramIndex++
    }

    if (options.maxPrice !== undefined) {
      conditions.push(`price <= $${paramIndex}`)
      params.push(options.maxPrice)
      paramIndex++
    }

    // Filter by minimum discount
    if (options.minDiscount !== undefined) {
      conditions.push(`discount >= $${paramIndex}`)
      params.push(options.minDiscount)
      paramIndex++
    }

    // Filter by search (full-text search on German)
    if (options.search) {
      conditions.push(`(
        to_tsvector('german', title || ' ' || COALESCE(description, ''))
        @@ plainto_tsquery('german', $${paramIndex})
        OR title ILIKE $${paramIndex + 1}
        OR description ILIKE $${paramIndex + 1}
      )`)
      params.push(options.search)
      params.push(`%${options.search}%`)
      paramIndex += 2
    }

    // Filter: Only show translated deals (exclude pending, processing, failed)
    conditions.push(`translation_status = 'completed'`)

    // Note: We don't filter by expires_at because many deals don't have expiry dates
    // and NULL expiry means the deal is ongoing. Users can see the expiry badge on cards.

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Sorting
    let orderBy = 'ORDER BY published_at DESC'
    switch (options.sortBy) {
      case 'price_asc':
        orderBy = 'ORDER BY price ASC NULLS LAST'
        break
      case 'price_desc':
        orderBy = 'ORDER BY price DESC NULLS LAST'
        break
      case 'discount':
        orderBy = 'ORDER BY discount DESC NULLS LAST'
        break
      case 'latest':
      default:
        orderBy = 'ORDER BY published_at DESC'
    }

    // Count total matching deals
    const countQuery = `SELECT COUNT(*) as total FROM deals ${whereClause}`
    const countResult = await query<{ total: string }>(countQuery, params)
    const total = parseInt(countResult.rows[0]?.total || '0')

    // Fetch paginated deals
    const dealsQuery = `
      SELECT * FROM deals
      ${whereClause}
      ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    params.push(limit, offset)

    const dealsResult = await query<DealRow>(dealsQuery, params)
    const deals = dealsResult.rows.map(mapRowToDeal)

    const totalPages = Math.max(Math.ceil(total / limit), 1)

    const result: DealsListResult = {
      deals,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      filters: options,
      meta: {
        fetchedAt: new Date().toISOString(),
        source: 'database',
        cacheHit: false,
      },
    }

    // Cache the result
    await cache.set(cacheKey, result, CACHE_TTL.DEALS_LIST)

    return result
  }

  /**
   * Get deal by ID
   */
  async getDealById(id: string): Promise<Deal | null> {
    // Try cache first
    const cacheKey = cacheKeys.dealDetail(id)
    const cached = await cache.get<Deal>(cacheKey)
    if (cached) {
      return cached
    }

    // Query database - only return translated deals
    const queryText = `SELECT * FROM deals WHERE id = $1 AND translation_status = 'completed' LIMIT 1`
    const result = await query<DealRow>(queryText, [id])

    if (result.rows.length === 0) {
      return null
    }

    const deal = mapRowToDeal(result.rows[0])

    // Cache the result
    await cache.set(cacheKey, deal, CACHE_TTL.DEAL_DETAIL)

    return deal
  }

  /**
   * Get categories with counts
   */
  async getCategories(): Promise<CategoriesResult> {
    // Try cache first
    const cacheKey = cacheKeys.categories()
    const cached = await cache.get<CategoriesResult>(cacheKey)
    if (cached) {
      return { ...cached, cacheHit: true }
    }

    // Query database
    const queryText = `
      SELECT
        cat AS name,
        COUNT(*) AS count
      FROM deals, jsonb_array_elements_text(categories) AS cat
      WHERE (expires_at IS NULL OR expires_at > NOW())
        AND translation_status = 'completed'
      GROUP BY cat
      ORDER BY count DESC
    `

    const result = await query<{ name: string; count: string }>(queryText)
    const categories = result.rows.map((row) => ({
      name: row.name,
      count: parseInt(row.count),
    }))

    const categoriesResult: CategoriesResult = {
      categories,
      fetchedAt: new Date().toISOString(),
      cacheHit: false,
    }

    // Cache the result
    await cache.set(cacheKey, categoriesResult, CACHE_TTL.CATEGORIES)

    return categoriesResult
  }

  /**
   * Increment views count for a deal
   */
  async incrementViews(dealId: string): Promise<void> {
    const queryText = `
      UPDATE deals
      SET views_count = views_count + 1
      WHERE id = $1
    `
    await query(queryText, [dealId])

    // Invalidate cache
    await cache.del(cacheKeys.dealDetail(dealId))
  }

  /**
   * Increment clicks count for a deal
   */
  async incrementClicks(dealId: string): Promise<void> {
    const queryText = `
      UPDATE deals
      SET clicks_count = clicks_count + 1
      WHERE id = $1
    `
    await query(queryText, [dealId])

    // Invalidate cache
    await cache.del(cacheKeys.dealDetail(dealId))
  }

  /**
   * Get deals statistics
   */
  async getStats(): Promise<{
    totalDeals: number
    activeDeals: number
    expiredDeals: number
    todayDeals: number
    totalCategories: number
    activeMerchants: number
    avgDiscount: number
    cacheHit: boolean
  }> {
    // Try cache first
    const cacheKey = cacheKeys.stats()
    const cached = await cache.get<any>(cacheKey)
    if (cached) {
      return { ...cached, cacheHit: true }
    }

    // Query database - only count translated deals
    const queryText = `
      SELECT
        COUNT(*) as total_deals,
        COUNT(*) FILTER (WHERE expires_at IS NULL OR expires_at > NOW()) as active_deals,
        COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_deals,
        COUNT(*) FILTER (WHERE published_at >= CURRENT_DATE) as today_deals,
        COUNT(DISTINCT merchant) FILTER (WHERE expires_at IS NULL OR expires_at > NOW()) as active_merchants,
        COALESCE(AVG(discount) FILTER (WHERE discount IS NOT NULL AND (expires_at IS NULL OR expires_at > NOW())), 0) as avg_discount,
        (SELECT COUNT(DISTINCT cat) FROM deals, jsonb_array_elements_text(categories) AS cat WHERE translation_status = 'completed') as total_categories
      FROM deals
      WHERE translation_status = 'completed'
    `

    const result = await query<{
      total_deals: string
      active_deals: string
      expired_deals: string
      today_deals: string
      active_merchants: string
      avg_discount: string
      total_categories: string
    }>(queryText)

    const row = result.rows[0]
    const stats = {
      totalDeals: parseInt(row.total_deals),
      activeDeals: parseInt(row.active_deals),
      expiredDeals: parseInt(row.expired_deals),
      todayDeals: parseInt(row.today_deals),
      activeMerchants: parseInt(row.active_merchants),
      avgDiscount: parseFloat(row.avg_discount),
      totalCategories: parseInt(row.total_categories),
      cacheHit: false,
    }

    // Cache the result
    await cache.set(cacheKey, stats, CACHE_TTL.STATS)

    return stats
  }
}

// Singleton instance
export const dealsRepository = new DealsRepository()
