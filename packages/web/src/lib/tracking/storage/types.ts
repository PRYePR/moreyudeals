/**
 * 点击追踪存储接口
 * 支持多种后端实现（内存、Redis、PostgreSQL等）
 */

import { ClickEvent, ClickStats } from '../types'

/**
 * 存储适配器接口
 */
export interface ITrackingStorage {
  /**
   * 保存点击事件
   */
  saveClick(event: ClickEvent): Promise<void>

  /**
   * 获取单个 Deal 的点击统计
   */
  getClickStats(dealId: string): Promise<ClickStats | null>

  /**
   * 获取所有点击事件
   */
  getAllClicks(options?: QueryOptions): Promise<ClickEvent[]>

  /**
   * 获取点击事件（分页）
   */
  getClicks(options: QueryOptions): Promise<PaginatedResult<ClickEvent>>

  /**
   * 获取所有 Deals 的统计摘要
   */
  getAllStats(options?: StatsQueryOptions): Promise<ClickStats[]>

  /**
   * 删除旧的点击记录
   */
  cleanupOldClicks(beforeDate: Date): Promise<number>

  /**
   * 清空所有记录（仅用于测试）
   */
  clearAll(): Promise<void>
}

/**
 * 查询选项
 */
export interface QueryOptions {
  /**
   * 限制返回数量
   */
  limit?: number

  /**
   * 偏移量
   */
  offset?: number

  /**
   * 开始日期
   */
  startDate?: Date

  /**
   * 结束日期
   */
  endDate?: Date

  /**
   * 按字段排序
   */
  orderBy?: 'clickedAt' | 'dealId'

  /**
   * 排序方向
   */
  order?: 'asc' | 'desc'
}

/**
 * 统计查询选项
 */
export interface StatsQueryOptions {
  /**
   * 限制返回数量
   */
  limit?: number

  /**
   * 按字段排序
   */
  orderBy?: 'totalClicks' | 'uniqueClicks' | 'lastClickedAt'

  /**
   * 排序方向
   */
  order?: 'asc' | 'desc'

  /**
   * 最小点击数过滤
   */
  minClicks?: number
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * 存储配置
 */
export interface StorageConfig {
  /**
   * 存储类型
   */
  type: 'memory' | 'redis' | 'postgresql'

  /**
   * Redis 连接URL（仅 type=redis 时使用）
   */
  redisUrl?: string

  /**
   * PostgreSQL 连接URL（仅 type=postgresql 时使用）
   */
  postgresUrl?: string

  /**
   * 数据保留天数（超过后自动清理）
   */
  retentionDays?: number

  /**
   * 是否启用自动清理
   */
  autoCleanup?: boolean
}
