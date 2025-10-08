/**
 * 缓存模块统一导出
 */

// Types
export * from './types'

// Implementations
export { RedisCache } from './redis-cache'
export { MemoryCache } from './memory-cache'
export { CacheManager } from './cache-manager'

// Utilities
export { cacheKeys, CacheKeyGenerator, CACHE_PREFIXES, CACHE_TTL } from './cache-keys'

// Factory function
import { CacheManager } from './cache-manager'
import type { CacheConfig } from './types'

/**
 * 创建缓存管理器实例
 */
export function createCacheManager(config?: CacheConfig): CacheManager {
  return new CacheManager(config)
}

/**
 * 默认缓存管理器实例
 */
export const defaultCache = createCacheManager({
  redisUrl: process.env.UPSTASH_REDIS_REST_URL,
  keyPrefix: 'moreyudeals',
  defaultTTL: 300, // 5 分钟
  enableMemoryFallback: true,
})
