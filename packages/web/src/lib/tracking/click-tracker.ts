import { ClickEvent, ClickStats } from './types'
import { defaultTrackingStorage } from './storage'
import type { ITrackingStorage, QueryOptions } from './storage/types'
import { createModuleLogger } from '../logger'

const logger = createModuleLogger('tracking:click-tracker')

/**
 * 点击追踪服务
 *
 * 支持多种存储后端（内存、Redis、PostgreSQL）
 * 通过环境变量 TRACKING_STORAGE_TYPE 配置存储类型
 */
class ClickTracker {
  private storage: ITrackingStorage

  constructor(storage?: ITrackingStorage) {
    this.storage = storage || defaultTrackingStorage
  }

  /**
   * 记录一次点击事件
   */
  async trackClick(event: Omit<ClickEvent, 'id' | 'clickedAt'>): Promise<void> {
    const clickEvent: ClickEvent = {
      ...event,
      id: this.generateId(),
      clickedAt: new Date(),
    }

    // 保存到存储
    await this.storage.saveClick(clickEvent)

    // 在开发环境打印日志
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Click tracked', {
        dealId: clickEvent.dealId,
        merchant: clickEvent.merchantName,
        target: clickEvent.targetUrl.substring(0, 60),
        userAgent: clickEvent.userAgent?.substring(0, 50),
      })
    }
  }

  /**
   * 获取某个优惠的点击统计
   */
  async getClickStats(dealId: string): Promise<{ totalClicks: number, uniqueIps: number }> {
    const stats = await this.storage.getClickStats(dealId)

    if (!stats) {
      return {
        totalClicks: 0,
        uniqueIps: 0,
      }
    }

    return {
      totalClicks: stats.totalClicks,
      uniqueIps: stats.uniqueClicks,
    }
  }

  /**
   * 获取详细的点击统计
   */
  async getDetailedStats(dealId: string): Promise<ClickStats | null> {
    return this.storage.getClickStats(dealId)
  }

  /**
   * 获取所有点击记录（用于调试）
   */
  async getAllClicks(options?: QueryOptions): Promise<ClickEvent[]> {
    return this.storage.getAllClicks(options)
  }

  /**
   * 获取所有 Deals 的统计
   */
  async getAllStats(options?: { limit?: number, orderBy?: 'totalClicks' | 'uniqueClicks' }): Promise<ClickStats[]> {
    return this.storage.getAllStats(options)
  }

  /**
   * 清理旧数据
   */
  async cleanupOldData(days: number = 90): Promise<number> {
    const beforeDate = new Date()
    beforeDate.setDate(beforeDate.getDate() - days)
    return this.storage.cleanupOldClicks(beforeDate)
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `click_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }

  /**
   * 清空点击记录（仅用于测试）
   */
  async clearClicks(): Promise<void> {
    await this.storage.clearAll()
  }
}

// 单例模式
export const clickTracker = new ClickTracker()
