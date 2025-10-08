/**
 * 内存存储实现
 * 适用于开发环境和小规模应用
 */

import { ClickEvent, ClickStats } from '../types'
import {
  ITrackingStorage,
  QueryOptions,
  StatsQueryOptions,
  PaginatedResult
} from './types'

/**
 * 内存存储适配器
 */
export class MemoryTrackingStorage implements ITrackingStorage {
  private clicks: ClickEvent[] = []

  /**
   * 保存点击事件
   */
  async saveClick(event: ClickEvent): Promise<void> {
    this.clicks.push(event)
  }

  /**
   * 获取单个 Deal 的点击统计
   */
  async getClickStats(dealId: string): Promise<ClickStats | null> {
    const dealClicks = this.clicks.filter(c => c.dealId === dealId)

    if (dealClicks.length === 0) {
      return null
    }

    // 计算唯一点击（基于 IP）
    const uniqueIps = new Set(dealClicks.map(c => c.userIp).filter(Boolean))

    // 按日期分组
    const clicksByDay: Record<string, number> = {}
    dealClicks.forEach(click => {
      const day = click.clickedAt.toISOString().split('T')[0]
      clicksByDay[day] = (clicksByDay[day] || 0) + 1
    })

    // 按商家分组
    const clicksByMerchant: Record<string, number> = {}
    dealClicks.forEach(click => {
      if (click.merchantName) {
        clicksByMerchant[click.merchantName] = (clicksByMerchant[click.merchantName] || 0) + 1
      }
    })

    // 获取最后点击时间
    const lastClickedAt = dealClicks.reduce((latest, click) => {
      return click.clickedAt > latest ? click.clickedAt : latest
    }, dealClicks[0].clickedAt)

    return {
      dealId,
      totalClicks: dealClicks.length,
      uniqueClicks: uniqueIps.size,
      lastClickedAt,
      clicksByDay,
      clicksByMerchant
    }
  }

  /**
   * 获取所有点击事件
   */
  async getAllClicks(options?: QueryOptions): Promise<ClickEvent[]> {
    let filteredClicks = [...this.clicks]

    // 应用日期过滤
    if (options?.startDate) {
      filteredClicks = filteredClicks.filter(c => c.clickedAt >= options.startDate!)
    }
    if (options?.endDate) {
      filteredClicks = filteredClicks.filter(c => c.clickedAt <= options.endDate!)
    }

    // 排序
    if (options?.orderBy) {
      const order = options.order || 'desc'
      filteredClicks.sort((a, b) => {
        const aValue = options.orderBy === 'clickedAt' ? a.clickedAt.getTime() : a.dealId
        const bValue = options.orderBy === 'clickedAt' ? b.clickedAt.getTime() : b.dealId
        return order === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1)
      })
    }

    // 应用分页
    if (options?.limit !== undefined) {
      const offset = options.offset || 0
      filteredClicks = filteredClicks.slice(offset, offset + options.limit)
    }

    return filteredClicks
  }

  /**
   * 获取点击事件（分页）
   */
  async getClicks(options: QueryOptions): Promise<PaginatedResult<ClickEvent>> {
    let filteredClicks = [...this.clicks]

    // 应用日期过滤
    if (options.startDate) {
      filteredClicks = filteredClicks.filter(c => c.clickedAt >= options.startDate!)
    }
    if (options.endDate) {
      filteredClicks = filteredClicks.filter(c => c.clickedAt <= options.endDate!)
    }

    const total = filteredClicks.length

    // 排序
    if (options.orderBy) {
      const order = options.order || 'desc'
      filteredClicks.sort((a, b) => {
        const aValue = options.orderBy === 'clickedAt' ? a.clickedAt.getTime() : a.dealId
        const bValue = options.orderBy === 'clickedAt' ? b.clickedAt.getTime() : b.dealId
        return order === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1)
      })
    }

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
  }

  /**
   * 获取所有 Deals 的统计摘要
   */
  async getAllStats(options?: StatsQueryOptions): Promise<ClickStats[]> {
    const dealIds = [...new Set(this.clicks.map(c => c.dealId))]
    const stats: ClickStats[] = []

    for (const dealId of dealIds) {
      const stat = await this.getClickStats(dealId)
      if (stat) {
        stats.push(stat)
      }
    }

    // 应用过滤
    let filteredStats = stats
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
  }

  /**
   * 删除旧的点击记录
   */
  async cleanupOldClicks(beforeDate: Date): Promise<number> {
    const initialLength = this.clicks.length
    this.clicks = this.clicks.filter(c => c.clickedAt >= beforeDate)
    return initialLength - this.clicks.length
  }

  /**
   * 清空所有记录（仅用于测试）
   */
  async clearAll(): Promise<void> {
    this.clicks = []
  }

  /**
   * 获取当前存储的点击数量
   */
  size(): number {
    return this.clicks.length
  }
}
