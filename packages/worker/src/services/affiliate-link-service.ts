/**
 * Affiliate Link Service
 * 统一处理联盟链接的服务
 *
 * 职责：
 * 1. 判断商家是否支持联盟计划
 * 2. 解析 forward 链接获取真实商品链接
 * 3. 添加我们的联盟标识码
 *
 * 扩展点：
 * - Amazon: 已实现
 * - eBay: 预留接口
 * - 其他联盟商家: 预留接口
 */

import { AmazonLinkResolver } from './amazon-link-resolver';

/**
 * 联盟链接处理结果
 */
export interface AffiliateLinkResult {
  /** 是否启用联盟 */
  enabled: boolean;
  /** 联盟链接（已添加我们的标识码） */
  affiliateLink?: string;
  /** 联盟网络类型 */
  network?: 'amazon' | 'ebay' | string;
}

/**
 * Affiliate Link Service
 * 统一的联盟链接处理服务
 */
export class AffiliateLinkService {
  private readonly amazonLinkResolver: AmazonLinkResolver;

  // 联盟标识码配置
  private readonly AMAZON_TAG = process.env.AMAZON_AFFILIATE_TAG || 'moreyu0a-21';
  // 未来可以添加：
  // private readonly EBAY_CAMPAIGN_ID = process.env.EBAY_CAMPAIGN_ID || '...';

  constructor() {
    this.amazonLinkResolver = new AmazonLinkResolver();
  }

  /**
   * 处理联盟链接
   * 根据商家判断是否需要处理联盟链接，并返回处理结果
   *
   * @param merchant 商家名称
   * @param canonicalMerchantName 规范化商家名称
   * @param merchantLink 商家链接（forward 链接或真实链接）
   * @returns 联盟链接处理结果
   */
  async processAffiliateLink(
    merchant?: string,
    canonicalMerchantName?: string,
    merchantLink?: string
  ): Promise<AffiliateLinkResult> {
    if (!merchantLink) {
      return { enabled: false };
    }

    // 1. 处理 Amazon 联盟
    if (this.isAmazon(merchant, canonicalMerchantName)) {
      return await this.processAmazonLink(merchantLink);
    }

    // 2. 预留：处理 eBay 联盟
    // if (this.isEbay(merchant, canonicalMerchantName)) {
    //   return await this.processEbayLink(merchantLink);
    // }

    // 3. 预留：处理其他联盟商家
    // if (this.isOtherPartner(merchant, canonicalMerchantName)) {
    //   return await this.processOtherPartnerLink(merchantLink);
    // }

    // 非联盟商家
    return { enabled: false };
  }

  /**
   * 处理 Amazon 联盟链接
   * 1. 如果是 forward 链接，解析获取真实 Amazon URL
   * 2. 清理原有联盟码
   * 3. 添加我们的联盟码
   */
  private async processAmazonLink(merchantLink: string): Promise<AffiliateLinkResult> {
    try {
      let amazonUrl = merchantLink;

      // 如果是 forward 链接，需要先解析
      if (merchantLink.includes('forward.sparhamster.at')) {
        console.log(`🔍 [Amazon] 解析 forward 链接...`);
        const realLink = await this.amazonLinkResolver.resolveRealAmazonLink(merchantLink);

        if (!realLink) {
          console.warn(`⚠️  [Amazon] 解析失败，跳过联盟处理`);
          return { enabled: false };
        }

        amazonUrl = realLink;
        console.log(`✅ [Amazon] 解析成功: ${amazonUrl}`);
      }

      // 添加我们的联盟码
      const affiliateLink = this.appendAmazonTag(amazonUrl, this.AMAZON_TAG);
      console.log(`✅ [Amazon] 已添加联盟码: ${affiliateLink}`);

      return {
        enabled: true,
        affiliateLink,
        network: 'amazon',
      };
    } catch (error) {
      console.error(`❌ [Amazon] 处理失败: ${(error as Error).message}`);
      return { enabled: false };
    }
  }

  /**
   * 判断商家是否为 Amazon
   */
  private isAmazon(merchant?: string, canonicalMerchantName?: string): boolean {
    const merchantName = (canonicalMerchantName || merchant || '').toLowerCase();
    return merchantName.includes('amazon');
  }

  /**
   * 为 Amazon 链接添加联盟标识码
   * 如果已有 tag 参数，替换为我们的 tag
   * 如果没有，添加 tag 参数
   */
  private appendAmazonTag(url: string, tag: string): string {
    try {
      const urlObj = new URL(url);

      // 如果已有 tag 参数，替换
      if (urlObj.searchParams.has('tag')) {
        urlObj.searchParams.set('tag', tag);
      } else {
        // 没有 tag 参数，添加
        urlObj.searchParams.append('tag', tag);
      }

      return urlObj.toString();
    } catch (error) {
      // URL 解析失败，尝试简单拼接
      console.warn(`⚠️  URL 解析失败，使用简单拼接: ${url}`);
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}tag=${tag}`;
    }
  }

  /**
   * 预留：判断商家是否为 eBay
   */
  // private isEbay(merchant?: string, canonicalMerchantName?: string): boolean {
  //   const merchantName = (canonicalMerchantName || merchant || '').toLowerCase();
  //   return merchantName.includes('ebay');
  // }

  /**
   * 预留：处理 eBay 联盟链接
   */
  // private async processEbayLink(merchantLink: string): Promise<AffiliateLinkResult> {
  //   // TODO: 实现 eBay Partner Network 逻辑
  //   return { enabled: false };
  // }
}
