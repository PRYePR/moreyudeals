/**
 * 缓存模块类型定义
 */

/**
 * 缓存选项
 */
export interface CacheOptions {
  /**
   * 过期时间（秒）
   */
  ttl?: number

  /**
   * 缓存键前缀
   */
  prefix?: string
}

/**
 * 缓存接口
 */
export interface ICache {
  /**
   * 获取缓存值
   */
  get<T>(key: string): Promise<T | null>

  /**
   * 设置缓存值
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>

  /**
   * 删除缓存值
   */
  delete(key: string): Promise<void>

  /**
   * 清空所有缓存
   */
  clear(): Promise<void>

  /**
   * 检查缓存是否存在
   */
  has(key: string): Promise<boolean>
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  /**
   * Redis 连接 URL (可选)
   */
  redisUrl?: string

  /**
   * 默认 TTL（秒）
   */
  defaultTTL?: number

  /**
   * 缓存键前缀
   */
  keyPrefix?: string

  /**
   * 是否启用内存缓存作为回退
   */
  enableMemoryFallback?: boolean
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
}
