/**
 * Amazon Link Resolver Service
 * 从 forward.sparhamster.at 重定向链接中提取真实的亚马逊商品链接
 *
 * 功能:
 * 1. 检测链接是否指向亚马逊
 * 2. 访问重定向链接,跟随跳转获取最终URL
 * 3. 提取纯净的亚马逊商品链接(去除原有的联盟码)
 */

import axios from 'axios';
import * as cheerio from '@moreyudeals/shared-html';

/**
 * Amazon Link Resolver
 */
export class AmazonLinkResolver {
  private readonly userAgent: string;
  private readonly timeout: number;
  private readonly maxRedirects: number;

  constructor() {
    this.userAgent = process.env.SPARHAMSTER_USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    this.timeout = 10000; // 10秒超时
    this.maxRedirects = 10; // 最多跟随10次重定向
  }

  /**
   * 检测商家是否为亚马逊
   * 主要通过 merchant 或 canonicalMerchantName 判断
   *
   * @param merchant 商家名称
   * @param canonicalMerchantName 规范化商家名称
   * @returns 是否为亚马逊
   */
  isAmazonMerchant(merchant?: string, canonicalMerchantName?: string): boolean {
    if (!merchant && !canonicalMerchantName) return false;

    // 优先使用规范化名称
    const merchantName = (canonicalMerchantName || merchant || '').toLowerCase();

    return merchantName.includes('amazon');
  }

  /**
   * 检测链接是否可能指向亚马逊
   * 通过商家名称或URL特征判断
   * @deprecated 使用 isAmazonMerchant 代替
   */
  isLikelyAmazonLink(merchantLink?: string, merchant?: string): boolean {
    if (!merchantLink) return false;

    // 1. URL中包含amazon
    if (merchantLink.toLowerCase().includes('amazon')) {
      return true;
    }

    // 2. 商家名称是Amazon
    if (merchant?.toLowerCase().includes('amazon')) {
      return true;
    }

    // 3. 已知的sparhamster联盟tag (他们用于亚马逊)
    if (merchantLink.includes('urbansoccer')) {
      return true;
    }

    return false;
  }

  /**
   * 解析真实的亚马逊链接
   * 访问forward页面,从HTML中提取真实的亚马逊商品URL
   *
   * @param forwardUrl forward.sparhamster.at 重定向链接
   * @returns 真实的亚马逊商品URL (去除联盟码)
   */
  async resolveRealAmazonLink(forwardUrl: string): Promise<string | null> {
    try {
      console.log(`🔗 解析亚马逊链接: ${forwardUrl}`);

      // 获取forward页面的HTML内容
      const response = await axios.get(forwardUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: this.timeout,
      });

      const html = response.data;

      // 策略1: 从Matomo追踪代码中提取
      // 格式: _paq.push(['setCustomUrl', 'https://www.sparhamster.at/out.php?link=https://www.amazon.de/dp/B08FCGW5VR/']);
      const matomoMatch = html.match(/_paq\.push\(\['setCustomUrl',\s*'[^']*link=(https?:\/\/[^']+)'\]\)/);
      if (matomoMatch) {
        const amazonUrl = decodeURIComponent(matomoMatch[1]);
        if (amazonUrl.includes('amazon.')) {
          const cleanUrl = this.cleanAmazonUrl(amazonUrl);
          console.log(`✅ 从Matomo追踪提取亚马逊链接: ${cleanUrl}`);
          return cleanUrl;
        }
      }

      // 策略2: 从window.location或meta refresh中提取
      const metaRefreshMatch = html.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=(https?:\/\/[^"']+)["']/i);
      if (metaRefreshMatch) {
        const amazonUrl = metaRefreshMatch[1];
        if (amazonUrl.includes('amazon.')) {
          const cleanUrl = this.cleanAmazonUrl(amazonUrl);
          console.log(`✅ 从meta refresh提取亚马逊链接: ${cleanUrl}`);
          return cleanUrl;
        }
      }

      // 策略3: 使用cheerio解析所有amazon链接
      const $ = cheerio.load(html);
      $('a[href*="amazon."], script').each((_, elem) => {
        const text = $(elem).text();
        const amazonMatch = text.match(/https?:\/\/[^"'\s]+amazon\.[^"'\s]+/);
        if (amazonMatch) {
          const amazonUrl = amazonMatch[0];
          if (amazonUrl.includes('amazon.')) {
            const cleanUrl = this.cleanAmazonUrl(amazonUrl);
            console.log(`✅ 从HTML内容提取亚马逊链接: ${cleanUrl}`);
            return cleanUrl;
          }
        }
      });

      console.warn(`⚠️  未在forward页面中找到亚马逊链接: ${forwardUrl}`);
      return null;

    } catch (error) {
      const message = (error as Error).message;
      console.error(`❌ 解析亚马逊链接失败: ${forwardUrl}, 错误: ${message}`);
      return null;
    }
  }

  /**
   * 清理亚马逊URL
   * 移除联盟码和跟踪参数,保留纯净的商品链接
   *
   * 保留格式: https://www.amazon.de/dp/B08XYZ123
   * 或: https://www.amazon.de/product-name/dp/B08XYZ123
   */
  private cleanAmazonUrl(amazonUrl: string): string {
    try {
      const url = new URL(amazonUrl);

      // 提取ASIN (Amazon Standard Identification Number)
      // 格式1: /dp/B08XYZ123
      // 格式2: /gp/product/B08XYZ123
      let asin: string | null = null;

      const dpMatch = url.pathname.match(/\/dp\/([A-Z0-9]{10})/);
      if (dpMatch) {
        asin = dpMatch[1];
      } else {
        const gpMatch = url.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/);
        if (gpMatch) {
          asin = gpMatch[1];
        }
      }

      if (!asin) {
        // 如果无法提取ASIN,返回原URL但移除查询参数
        url.search = '';
        return url.toString();
      }

      // 构建纯净的亚马逊商品链接
      const cleanUrl = `${url.protocol}//${url.hostname}/dp/${asin}`;
      return cleanUrl;

    } catch (error) {
      console.warn(`⚠️  清理亚马逊URL失败,返回原始URL: ${amazonUrl}`);
      return amazonUrl;
    }
  }

  /**
   * 批量解析亚马逊链接 (带延迟,避免被限流)
   */
  async resolveMultiple(forwardUrls: string[], delayMs: number = 500): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    for (let i = 0; i < forwardUrls.length; i++) {
      const forwardUrl = forwardUrls[i];
      const realUrl = await this.resolveRealAmazonLink(forwardUrl);

      if (realUrl) {
        results.set(forwardUrl, realUrl);
      }

      // 延迟,避免被限流
      if (i < forwardUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }
}
