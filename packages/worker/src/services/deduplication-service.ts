/**
 * Deduplication Service
 * 基于 content_hash 实现内容级去重机制
 *
 * 策略:
 * 1. 首先检查 source_site + guid 是否存在 (精确去重)
 * 2. 然后检查 content_hash 是否在 7 天内出现过 (内容级去重)
 * 3. 如果检测为重复,则增加 duplicate_count 并更新 last_seen_at
 */

import { DatabaseManager } from '../database';
import { Deal } from '../types/deal.types';

/**
 * 去重检查结果
 */
export interface DuplicationCheckResult {
  /** 是否为重复内容 */
  isDuplicate: boolean;
  /** 如果为重复,返回已存在的 Deal */
  existingDeal?: Deal;
  /** 重复类型: 'guid' | 'content_hash' */
  duplicateType?: 'guid' | 'content_hash';
}

/**
 * Deduplication Service
 * 提供去重检查和处理逻辑
 */
export class DeduplicationService {
  constructor(private readonly database: DatabaseManager) {}

  /**
   * 检查 Deal 是否为重复内容
   *
   * @param deal 待检查的 Deal 对象
   * @returns 去重检查结果
   */
  async checkDuplicate(deal: Deal): Promise<DuplicationCheckResult> {
    // 策略1: 检查 source_site + guid (精确去重)
    const existingByGuid = await this.database.getDealBySourceGuid(
      deal.sourceSite,
      deal.guid
    );

    if (existingByGuid) {
      return {
        isDuplicate: true,
        existingDeal: existingByGuid,
        duplicateType: 'guid',
      };
    }

    // 策略2: 检查 content_hash (内容级去重,7 天内)
    if (deal.contentHash) {
      const existingByHash = await this.database.getDealByContentHash(
        deal.contentHash,
        7 // 7 天窗口
      );

      if (existingByHash) {
        return {
          isDuplicate: true,
          existingDeal: existingByHash,
          duplicateType: 'content_hash',
        };
      }
    }

    // 不是重复内容
    return { isDuplicate: false };
  }

  /**
   * 处理重复内容
   * 增加 duplicate_count 并更新 last_seen_at
   * 同时更新商家信息(如果新数据包含商家信息且原记录缺失)
   *
   * @param dealId 已存在的 Deal ID
   * @param newDeal 新抓取的 Deal 数据(可选,用于更新商家信息)
   */
  async handleDuplicate(dealId: string, newDeal?: Deal): Promise<void> {
    await this.database.incrementDuplicateCount(dealId);

    const updateData: Partial<Deal> = {
      lastSeenAt: new Date(),
    };

    // 如果新数据包含商家信息,更新到数据库
    if (newDeal?.merchant) {
      updateData.merchant = newDeal.merchant;
      updateData.merchantLogo = newDeal.merchantLogo;
      updateData.merchantLink = newDeal.merchantLink;
      console.log(`🔁 检测到重复内容,已更新 Deal ${dealId} 的统计信息和商家信息: ${newDeal.merchant}`);
    } else {
      console.log(`🔁 检测到重复内容,已更新 Deal ${dealId} 的统计信息`);
    }

    await this.database.updateDeal(dealId, updateData);
  }

  /**
   * 完整的去重流程
   * 检查 + 处理
   *
   * @param deal 待处理的 Deal
   * @returns 去重结果
   */
  async process(deal: Deal): Promise<DuplicationCheckResult> {
    const result = await this.checkDuplicate(deal);

    if (result.isDuplicate && result.existingDeal) {
      await this.handleDuplicate(result.existingDeal.id, deal);
    }

    return result;
  }
}
