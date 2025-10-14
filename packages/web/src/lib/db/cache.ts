/**
 * Redis cache manager for Web application
 */

import Redis from 'ioredis'

export interface CacheStats {
  hits: number
  misses: number
  errors: number
}

class CacheManager {
  private redis: Redis | null = null
  private stats: CacheStats = { hits: 0, misses: 0, errors: 0 }
  private enabled: boolean

  constructor() {
    this.enabled = !!process.env.REDIS_URL

    if (this.enabled) {
      try {
        this.redis = new Redis(process.env.REDIS_URL!, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000)
            return delay
          },
          reconnectOnError: (err) => {
            const targetError = 'READONLY'
            if (err.message.includes(targetError)) {
              return true
            }
            return false
          },
        })

        this.redis.on('error', (err) => {
          console.error('Redis connection error:', err)
          this.stats.errors++
        })

        this.redis.on('connect', () => {
          console.log('Redis connected successfully')
        })

        console.log('Redis cache manager initialized')
      } catch (error) {
        console.error('Failed to initialize Redis:', error)
        this.enabled = false
      }
    } else {
      console.warn('Redis cache disabled (REDIS_URL not configured)')
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.redis) {
      return null
    }

    try {
      const value = await this.redis.get(key)
      if (value) {
        this.stats.hits++
        return JSON.parse(value) as T
      } else {
        this.stats.misses++
        return null
      }
    } catch (error) {
      console.error('Redis get error:', error)
      this.stats.errors++
      return null
    }
  }

  /**
   * Set value in cache with optional TTL (in seconds)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.enabled || !this.redis) {
      return
    }

    try {
      const serialized = JSON.stringify(value)
      if (ttl) {
        await this.redis.setex(key, ttl, serialized)
      } else {
        await this.redis.set(key, serialized)
      }
    } catch (error) {
      console.error('Redis set error:', error)
      this.stats.errors++
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    if (!this.enabled || !this.redis) {
      return
    }

    try {
      await this.redis.del(key)
    } catch (error) {
      console.error('Redis del error:', error)
      this.stats.errors++
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  async delPattern(pattern: string): Promise<void> {
    if (!this.enabled || !this.redis) {
      return
    }

    try {
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      console.error('Redis delPattern error:', error)
      this.stats.errors++
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.enabled || !this.redis) {
      return false
    }

    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      console.error('Redis exists error:', error)
      this.stats.errors++
      return false
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, errors: 0 }
  }

  /**
   * Check if cache is enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
      this.redis = null
      console.log('Redis connection closed')
    }
  }
}

// Singleton instance
export const cache = new CacheManager()

/**
 * Cache key generators
 */
export const cacheKeys = {
  dealsList: (params: { page?: number; limit?: number; category?: string; search?: string; sortBy?: string; sortOrder?: string }) => {
    const keyParts = ['deals', 'list']
    if (params.category) keyParts.push(`cat:${params.category}`)
    if (params.search) keyParts.push(`q:${params.search}`)
    if (params.sortBy) keyParts.push(`sort:${params.sortBy}:${params.sortOrder || 'desc'}`)
    keyParts.push(`page:${params.page || 1}`)
    keyParts.push(`limit:${params.limit || 20}`)
    return keyParts.join(':')
  },
  dealDetail: (id: string) => `deals:detail:${id}`,
  categories: () => 'deals:categories',
  stats: () => 'deals:stats',
}

/**
 * Cache TTL constants (in seconds)
 */
export const CACHE_TTL = {
  DEALS_LIST: 300, // 5 minutes
  DEAL_DETAIL: 600, // 10 minutes
  CATEGORIES: 900, // 15 minutes
  STATS: 300, // 5 minutes
}
