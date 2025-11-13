/**
 * 商家名称规范化工具(Web端)
 *
 * 负责将各种商家名称写法统一为规范的ID和显示名称
 */

import { MERCHANT_MAPPINGS, type MerchantMapping } from '../config/merchant-mapping';

/**
 * 规范化结果
 */
export interface NormalizedMerchant {
  /** 规范商家ID */
  canonicalId: string;
  /** 规范商家显示名称 */
  canonicalName: string;
  /** 原始商家名称 */
  originalName: string;
  /** 是否匹配到规范配置 */
  isMatched: boolean;
  /** 匹配到的配置 (如果有) */
  mapping?: MerchantMapping;
}

/**
 * 规范化商家名称
 *
 * @param merchantName - 原始商家名称
 * @returns 规范化后的商家信息
 *
 * @example
 * ```ts
 * // 匹配到规范名称
 * normalizeMerchant('amazon.at')
 * // => { canonicalId: 'amazon-de', canonicalName: 'Amazon.de', isMatched: true }
 *
 * // 未匹配到，使用原始名称
 * normalizeMerchant('Unknown Store')
 * // => { canonicalId: 'unknown-store', canonicalName: 'Unknown Store', isMatched: false }
 * ```
 */
export function normalizeMerchant(merchantName: string | undefined | null): NormalizedMerchant {
  // 处理空值
  if (!merchantName || merchantName.trim() === '') {
    return {
      canonicalId: 'unknown',
      canonicalName: 'Unknown',
      originalName: merchantName || '',
      isMatched: false
    };
  }

  // 清理商家名称: 去除首尾空白，统一为小写用于匹配
  const cleanName = merchantName.trim();
  const normalizedName = cleanName.toLowerCase();

  // 查找匹配的映射配置
  const mapping = MERCHANT_MAPPINGS.find(m =>
    m.aliases.some(alias => alias.toLowerCase() === normalizedName)
  );

  if (mapping) {
    // 找到匹配的规范配置
    return {
      canonicalId: mapping.canonicalId,
      canonicalName: mapping.canonicalName,
      originalName: cleanName,
      isMatched: true,
      mapping
    };
  }

  // 未找到匹配，使用原始名称并生成 ID
  return {
    canonicalId: generateMerchantId(cleanName),
    canonicalName: cleanName,
    originalName: cleanName,
    isMatched: false
  };
}

/**
 * 从商家名称生成规范 ID
 *
 * 规则:
 * - 转小写
 * - 移除特殊字符
 * - 空格替换为连字符
 * - 移除多余的连字符
 *
 * @param name - 商家名称
 * @returns 生成的 ID
 *
 * @example
 * ```ts
 * generateMerchantId('Amazon.at') // => 'amazon-at'
 * generateMerchantId('H&M Store') // => 'hm-store'
 * generateMerchantId('Müller') // => 'muller'
 * ```
 */
function generateMerchantId(name: string): string {
  return name
    .toLowerCase()
    // 替换特殊字符为标准字符
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    // 移除非字母数字和连字符的字符，空格替换为连字符
    .replace(/[^a-z0-9-\s]/g, '')
    .replace(/\s+/g, '-')
    // 移除多余的连字符
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * 批量规范化商家名称
 *
 * @param merchantNames - 商家名称列表
 * @returns 规范化结果列表
 */
export function normalizeMerchants(merchantNames: string[]): NormalizedMerchant[] {
  return merchantNames.map(name => normalizeMerchant(name));
}

/**
 * 获取所有规范商家列表
 *
 * @returns 所有已配置的规范商家
 */
export function getAllCanonicalMerchants(): MerchantMapping[] {
  return MERCHANT_MAPPINGS;
}

/**
 * 根据规范ID查找商家配置
 *
 * @param canonicalId - 规范商家ID
 * @returns 商家配置，如果未找到则返回 null
 */
export function getMerchantByCanonicalId(canonicalId: string): MerchantMapping | null {
  return MERCHANT_MAPPINGS.find(m => m.canonicalId === canonicalId) || null;
}

/**
 * 检查商家名称是否已配置规范映射
 *
 * @param merchantName - 商家名称
 * @returns 是否已配置
 */
export function isMerchantMapped(merchantName: string): boolean {
  const result = normalizeMerchant(merchantName);
  return result.isMatched;
}
