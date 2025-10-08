/**
 * 缓存管理器
 * 支持 Redis + 内存缓存的双层架构
 */

import type { ICache, CacheConfig } from './types'
import { RedisCache } from './redis-cache'
import { MemoryCache } from './memory-cache'
import { createModuleLogger } from '../logger'

const logger = createModuleLogger('cache')

/**
 * 缓存管理器
 *
 * 策略：
 * 1. 优先使用 Redis（如果可用）
 * 2. Redis 不可用时降级到内存缓存
 * 3. 支持双层缓存：内存作为 L1，Redis 作为 L2
 */
export class CacheManager implements ICache {
  private primaryCache: ICache
  private fallbackCache: ICache | null = null
  private defaultTTL: number

  constructor(config: CacheConfig = {}) {
    this.defaultTTL = config.defaultTTL || 300 // 默认 5 分钟

    // 初始化主缓存
    if (config.redisUrl) {
      logger.info('Initializing with Redis as primary cache')
      try {
        this.primaryCache = new RedisCache(
          config.redisUrl,
          config.keyPrefix || 'moreyudeals'
        )
      } catch (error) {
        logger.error('Failed to initialize Redis, falling back to memory cache', error as Error)
        this.primaryCache = new MemoryCache()
      }
    } else {
      logger.info('Initializing with memory cache')
      this.primaryCache = new MemoryCache()
    }

    // 初始化回退缓存（如果启用）
    if (config.enableMemoryFallback && config.redisUrl) {
      logger.info('Enabling memory cache as fallback')
      this.fallbackCache = new MemoryCache()
    }
  }

  /**
   * 获取缓存值
   *
   * 策略：
   * 1. 先从主缓存获取
   * 2. 如果主缓存失败且有回退缓存，从回退缓存获取
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.primaryCache.get<T>(key)

      if (value !== null) {
        // 如果有回退缓存，同步到回退缓存
        if (this.fallbackCache) {
          await this.fallbackCache.set(key, value, this.defaultTTL).catch(() => {
            // 忽略回退缓存的错误
          })
        }
        return value
      }

      // 主缓存未命中，尝试回退缓存
      if (this.fallbackCache) {
        const fallbackValue = await this.fallbackCache.get<T>(key)
        if (fallbackValue !== null) {
          logger.debug('Cache hit in fallback', { key })
          // 回写到主缓存
          await this.primaryCache.set(key, fallbackValue, this.defaultTTL).catch(() => {
            // 忽略主缓存的错误
          })
          return fallbackValue
        }
      }

      return null
    } catch (error) {
      logger.error('Error getting key from cache', error as Error, { key })

      // 主缓存失败，尝试回退缓存
      if (this.fallbackCache) {
        try {
          return await this.fallbackCache.get<T>(key)
        } catch (fallbackError) {
          logger.error('Fallback cache also failed', fallbackError as Error, { key })
        }
      }

      return null
    }
  }

  /**
   * 设置缓存值
   *
   * 策略：
   * 1. 同时写入主缓存和回退缓存
   * 2. 主缓存失败不影响回退缓存
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const effectiveTTL = ttl || this.defaultTTL

    try {
      await this.primaryCache.set(key, value, effectiveTTL)
    } catch (error) {
      logger.error('Error setting key in primary cache', error as Error, { key })
    }

    // 同时写入回退缓存
    if (this.fallbackCache) {
      try {
        await this.fallbackCache.set(key, value, effectiveTTL)
      } catch (error) {
        logger.error('Error setting key in fallback cache', error as Error, { key })
      }
    }
  }

  /**
   * 删除缓存值
   */
  async delete(key: string): Promise<void> {
    try {
      await this.primaryCache.delete(key)
    } catch (error) {
      logger.error('Error deleting key from primary cache', error as Error, { key })
    }

    if (this.fallbackCache) {
      try {
        await this.fallbackCache.delete(key)
      } catch (error) {
        logger.error('Error deleting key from fallback cache', error as Error, { key })
      }
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    try {
      await this.primaryCache.clear()
    } catch (error) {
      logger.error('Error clearing primary cache', error as Error)
    }

    if (this.fallbackCache) {
      try {
        await this.fallbackCache.clear()
      } catch (error) {
        logger.error('Error clearing fallback cache', error as Error)
      }
    }
  }

  /**
   * 检查缓存是否存在
   */
  async has(key: string): Promise<boolean> {
    try {
      const exists = await this.primaryCache.has(key)
      if (exists) {
        return true
      }

      if (this.fallbackCache) {
        return await this.fallbackCache.has(key)
      }

      return false
    } catch (error) {
      logger.error('Error checking key', error as Error, { key })
      return false
    }
  }

  /**
   * 包装异步函数，自动处理缓存
   *
   * @param key 缓存键
   * @param fn 要执行的函数
   * @param ttl 过期时间（秒）
   */
  async wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    // 先尝试从缓存获取
    const cached = await this.get<T>(key)
    if (cached !== null) {
      logger.debug('Cache hit', { key })
      return cached
    }

    // 缓存未命中，执行函数
    logger.debug('Cache miss, executing function', { key })
    const result = await fn()

    // 存入缓存
    await this.set(key, result, ttl)

    return result
  }
}
