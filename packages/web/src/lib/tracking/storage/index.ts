/**
 * 存储模块统一导出
 */

// Types
export * from './types'

// Implementations
export { MemoryTrackingStorage } from './memory-storage'
export { RedisTrackingStorage } from './redis-storage'

// Factory
import { ITrackingStorage, StorageConfig } from './types'
import { MemoryTrackingStorage } from './memory-storage'
import { RedisTrackingStorage } from './redis-storage'
import { createModuleLogger } from '../../logger'

const logger = createModuleLogger('tracking:storage')

/**
 * 创建存储实例
 */
export function createTrackingStorage(config?: StorageConfig): ITrackingStorage {
  const type = config?.type || 'memory'

  switch (type) {
    case 'memory':
      logger.info('Using memory storage')
      return new MemoryTrackingStorage()

    case 'redis':
      logger.info('Using Redis storage')
      return new RedisTrackingStorage()

    case 'postgresql':
      // TODO: 实现 PostgreSQL 存储
      logger.warn('PostgreSQL storage not implemented, falling back to memory')
      return new MemoryTrackingStorage()

    default:
      logger.warn('Unknown storage type, using memory', { type })
      return new MemoryTrackingStorage()
  }
}

/**
 * 默认存储实例
 */
export const defaultTrackingStorage = createTrackingStorage({
  type: process.env.TRACKING_STORAGE_TYPE as any || 'memory',
  redisUrl: process.env.UPSTASH_REDIS_REST_URL,
  retentionDays: 90, // 保留90天数据
  autoCleanup: true
})
