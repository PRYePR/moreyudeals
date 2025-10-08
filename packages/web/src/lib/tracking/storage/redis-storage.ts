/**
 * Redis 存储实现
 * 适用于生产环境的高性能持久化存储
 *
 * 数据结构设计：
 * - clicks:{dealId}:events - List 存储该 deal 的所有点击事件
 * - clicks:{dealId}:stats - Hash 存储该 deal 的统计信息
 * - clicks:all:list - List 存储所有点击事件的引用
 * - clicks:ips:{dealId} - Set 存储该 deal 的唯一 IP
 */

import { ClickEvent, ClickStats } from '../types'
import {
  ITrackingStorage,
  QueryOptions,
  StatsQueryOptions,
  PaginatedResult
} from './types'
import { defaultCache } from '../../cache'
import { createModuleLogger } from '../../logger'

const logger = createModuleLogger('tracking:redis-storage')

/**
 * Redis 存储适配器
 *
 * 注意：当前使用 defaultCache 作为底层存储
 * 实际生产环境建议使用专门的 Redis 客户端
 */
export class RedisTrackingStorage implements ITrackingStorage {
  private keyPrefix: string

  constructor(keyPrefix: string = 'clicks') {
    this.keyPrefix = keyPrefix
  }

  /**
   * 生成键名
   */
  private getKey(...parts: string[]): string {
    return [this.keyPrefix, ...parts].join(':')
  }

  /**
   * 保存点击事件
   */
  async saveClick(event: ClickEvent): Promise<void> {
    try {
      // 1. 保存到 all:list
      const allClicksKey = this.getKey('all', 'list')
      const allClicks = await defaultCache.get<ClickEvent[]>(allClicksKey) || []
      allClicks.push(event)
      await defaultCache.set(allClicksKey, allClicks)

      // 2. 保存到 {dealId}:events
      const dealEventsKey = this.getKey(event.dealId, 'events')
      const dealEvents = await defaultCache.get<ClickEvent[]>(dealEventsKey) || []
      dealEvents.push(event)
      await defaultCache.set(dealEventsKey, dealEvents)

      // 3. 更新 {dealId}:ips（唯一IP集合）
      if (event.userIp) {
        const ipsKey = this.getKey(event.dealId, 'ips')
        const ips = await defaultCache.get<string[]>(ipsKey) || []
        if (!ips.includes(event.userIp)) {
          ips.push(event.userIp)
          await defaultCache.set(ipsKey, ips)
        }
      }

      // 4. 更新统计信息（异步，不阻塞主流程）
      this.updateStatsAsync(event.dealId).catch(err => {
        logger.error('Failed to update stats', err as Error, { dealId: event.dealId })
      })

    } catch (error) {
      logger.error('Error saving click to Redis', error as Error)
      throw error
    }
  }

  /**
   * 异步更新统计信息
   */
  private async updateStatsAsync(dealId: string): Promise<void> {
    const stats = await this.calculateStats(dealId)
    const statsKey = this.getKey(dealId, 'stats')
    await defaultCache.set(statsKey, stats)
  }

  /**
   * 计算单个 Deal 的统计信息
   */
  private async calculateStats(dealId: string): Promise<ClickStats> {
    const eventsKey = this.getKey(dealId, 'events')
    const ipsKey = this.getKey(dealId, 'ips')

    const events = await defaultCache.get<ClickEvent[]>(eventsKey) || []
    const ips = await defaultCache.get<string[]>(ipsKey) || []

    // 按日期分组
    const clicksByDay: Record<string, number> = {}
    events.forEach(event => {
      const day = event.clickedAt.toISOString().split('T')[0]
      clicksByDay[day] = (clicksByDay[day] || 0) + 1
    })

    // 按商家分组
    const clicksByMerchant: Record<string, number> = {}
    events.forEach(event => {
      if (event.merchantName) {
        clicksByMerchant[event.merchantName] = (clicksByMerchant[event.merchantName] || 0) + 1
      }
    })

    // 最后点击时间
    const lastClickedAt = events.length > 0
      ? events.reduce((latest, event) => {
          const eventDate = new Date(event.clickedAt)
          return eventDate > latest ? eventDate : latest
        }, new Date(events[0].clickedAt))
      : undefined

    return {
      dealId,
      totalClicks: events.length,
      uniqueClicks: ips.length,
      lastClickedAt,
      clicksByDay,
      clicksByMerchant
    }
  }

  /**
   * 获取单个 Deal 的点击统计
   */
  async getClickStats(dealId: string): Promise<ClickStats | null> {
    try {
      // 先尝试从缓存获取
      const statsKey = this.getKey(dealId, 'stats')
      let stats = await defaultCache.get<ClickStats>(statsKey)

      // 如果缓存不存在，重新计算
      if (!stats) {
        const eventsKey = this.getKey(dealId, 'events')
        const events = await defaultCache.get<ClickEvent[]>(eventsKey)

        if (!events || events.length === 0) {
          return null
        }

        stats = await this.calculateStats(dealId)
        await defaultCache.set(statsKey, stats)
      }

      return stats
    } catch (error) {
      logger.error('Error getting click stats', error as Error, { dealId })
      return null
    }
  }

  /**
   * 获取所有点击事件
   */
  async getAllClicks(options?: QueryOptions): Promise<ClickEvent[]> {
    try {
      const allClicksKey = this.getKey('all', 'list')
      let clicks = await defaultCache.get<ClickEvent[]>(allClicksKey) || []

      // 将字符串日期转换回 Date 对象
      clicks = clicks.map(c => ({
        ...c,
        clickedAt: new Date(c.clickedAt)
      }))

      // 应用过滤和排序
      return this.filterAndSortClicks(clicks, options)
    } catch (error) {
      logger.error('Error getting all clicks', error as Error)
      return []
    }
  }

  /**
   * 获取点击事件（分页）
   */
  async getClicks(options: QueryOptions): Promise<PaginatedResult<ClickEvent>> {
    try {
      const allClicksKey = this.getKey('all', 'list')
      let clicks = await defaultCache.get<ClickEvent[]>(allClicksKey) || []

      // 将字符串日期转换回 Date 对象
      clicks = clicks.map(c => ({
        ...c,
        clickedAt: new Date(c.clickedAt)
      }))

      // 应用过滤
      let filteredClicks = this.filterAndSortClicks(clicks, options)
      const total = filteredClicks.length

      // 应用分页
      const limit = options.limit || 10
      const offset = options.offset || 0
      const data = filteredClicks.slice(offset, offset + limit)

      return {
        data,
        total,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        hasMore: offset + limit < total
      }
    } catch (error) {
      logger.error('Error getting paginated clicks', error as Error)
      return {
        data: [],
        total: 0,
        page: 1,
        pageSize: options.limit || 10,
        hasMore: false
      }
    }
  }

  /**
   * 过滤和排序点击事件
   */
  private filterAndSortClicks(clicks: ClickEvent[], options?: QueryOptions): ClickEvent[] {
    let result = [...clicks]

    // 应用日期过滤
    if (options?.startDate) {
      result = result.filter(c => c.clickedAt >= options.startDate!)
    }
    if (options?.endDate) {
      result = result.filter(c => c.clickedAt <= options.endDate!)
    }

    // 排序
    if (options?.orderBy) {
      const order = options.order || 'desc'
      result.sort((a, b) => {
        const aValue = options.orderBy === 'clickedAt' ? a.clickedAt.getTime() : a.dealId
        const bValue = options.orderBy === 'clickedAt' ? b.clickedAt.getTime() : b.dealId
        return order === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1)
      })
    }

    return result
  }

  /**
   * 获取所有 Deals 的统计摘要
   */
  async getAllStats(options?: StatsQueryOptions): Promise<ClickStats[]> {
    try {
      const allClicksKey = this.getKey('all', 'list')
      const clicks = await defaultCache.get<ClickEvent[]>(allClicksKey) || []

      // 获取所有唯一的 dealId
      const dealIds = [...new Set(clicks.map(c => c.dealId))]

      // 获取每个 deal 的统计
      const statsPromises = dealIds.map(dealId => this.getClickStats(dealId))
      const allStats = (await Promise.all(statsPromises)).filter(Boolean) as ClickStats[]

      // 应用过滤
      let filteredStats = allStats
      if (options?.minClicks) {
        filteredStats = filteredStats.filter(s => s.totalClicks >= options.minClicks!)
      }

      // 排序
      if (options?.orderBy) {
        const order = options.order || 'desc'
        filteredStats.sort((a, b) => {
          let aValue: any, bValue: any

          switch (options.orderBy) {
            case 'totalClicks':
              aValue = a.totalClicks
              bValue = b.totalClicks
              break
            case 'uniqueClicks':
              aValue = a.uniqueClicks
              bValue = b.uniqueClicks
              break
            case 'lastClickedAt':
              aValue = a.lastClickedAt?.getTime() || 0
              bValue = b.lastClickedAt?.getTime() || 0
              break
            default:
              return 0
          }

          return order === 'asc' ? (aValue - bValue) : (bValue - aValue)
        })
      }

      // 应用限制
      if (options?.limit) {
        filteredStats = filteredStats.slice(0, options.limit)
      }

      return filteredStats
    } catch (error) {
      logger.error('Error getting all stats', error as Error)
      return []
    }
  }

  /**
   * 删除旧的点击记录
   */
  async cleanupOldClicks(beforeDate: Date): Promise<number> {
    try {
      const allClicksKey = this.getKey('all', 'list')
      const clicks = await defaultCache.get<ClickEvent[]>(allClicksKey) || []

      const initialLength = clicks.length
      const filteredClicks = clicks.filter(c => new Date(c.clickedAt) >= beforeDate)
      await defaultCache.set(allClicksKey, filteredClicks)

      // 同时清理每个 deal 的事件
      const dealIds = [...new Set(clicks.map(c => c.dealId))]
      for (const dealId of dealIds) {
        const eventsKey = this.getKey(dealId, 'events')
        const dealEvents = await defaultCache.get<ClickEvent[]>(eventsKey) || []
        const filteredDealEvents = dealEvents.filter(c => new Date(c.clickedAt) >= beforeDate)
        await defaultCache.set(eventsKey, filteredDealEvents)

        // 重新计算统计
        await this.updateStatsAsync(dealId)
      }

      return initialLength - filteredClicks.length
    } catch (error) {
      logger.error('Error cleaning up old clicks', error as Error)
      return 0
    }
  }

  /**
   * 清空所有记录（仅用于测试）
   */
  async clearAll(): Promise<void> {
    try {
      // 清空 all:list
      const allClicksKey = this.getKey('all', 'list')
      await defaultCache.delete(allClicksKey)

      // 注意：这里只清空主列表
      // 实际生产环境应该遍历所有 dealId 并清空相关键
      logger.warn('clearAll() only clears main list')
    } catch (error) {
      logger.error('Error clearing all clicks', error as Error)
      throw error
    }
  }
}
