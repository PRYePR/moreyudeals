/**
 * 内存缓存实现
 * 作为 Redis 的回退方案
 */

import type { ICache, CacheStats } from './types'
import { createModuleLogger } from '../logger'

const logger = createModuleLogger('cache:memory')

/**
 * 缓存条目
 */
interface CacheEntry<T> {
  value: T
  expiresAt: number | null
}

/**
 * 内存缓存适配器
 */
export class MemoryCache implements ICache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  }
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // 每 5 分钟清理一次过期缓存
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired()
    }, 5 * 60 * 1000)
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    // 检查是否过期
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    this.stats.hits++
    return entry.value as T
  }

  /**
   * 设置缓存值
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiresAt = ttl && ttl > 0 ? Date.now() + ttl * 1000 : null

    this.cache.set(key, {
      value,
      expiresAt,
    })

    this.stats.sets++
  }

  /**
   * 删除缓存值
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key)
    this.stats.deletes++
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    this.cache.clear()
  }

  /**
   * 检查缓存是否存在
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key)

    if (!entry) {
      return false
    }

    // 检查是否过期
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpired(): void {
    const now = Date.now()
    let cleanedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt !== null && entry.expiresAt < now) {
        this.cache.delete(key)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Cleaned up expired entries', { count: cleanedCount })
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    }
  }

  /**
   * 获取缓存命中率
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses
    return total === 0 ? 0 : this.stats.hits / total
  }

  /**
   * 获取当前缓存大小
   */
  size(): number {
    return this.cache.size
  }

  /**
   * 停止清理定时器
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}
