/**
 * Preisjaeger Link Resolver Service
 * 解析 Preisjaeger 的加密跳转链接，提取真实商品链接
 *
 * 功能:
 * 1. 访问 /visit/homenew/{threadId} 跳转链接
 * 2. 跟随重定向获取真实商品 URL
 * 3. 清洗链接，提取干净的商品 URL（如 Amazon）
 *
 * 示例:
 * 输入: https://www.preisjaeger.at/visit/homenew/3681234
 * 输出: https://www.amazon.de/dp/B0FNWKCDLS
 */

import axios from 'axios';

export interface PreisjaegerLinkResolveResult {
  success: boolean;
  originalUrl: string;
  resolvedUrl?: string;
  cleanUrl?: string;
  merchant?: string;
  error?: string;
}

export class PreisjaegerLinkResolver {
  private readonly userAgent: string;
  private readonly timeout: number;

  constructor() {
    this.userAgent = process.env.PREISJAEGER_USER_AGENT ||
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.timeout = 10000; // 10秒超时
  }

  /**
   * 解析 Preisjaeger 跳转链接
   *
   * @param visitUrl - Preisjaeger 跳转链接，如 https://www.preisjaeger.at/visit/homenew/3681234
   * @returns 解析结果，包含真实链接
   */
  async resolveLink(visitUrl: string): Promise<PreisjaegerLinkResolveResult> {
    try {
      console.log(`🔗 解析 Preisjaeger 跳转链接: ${visitUrl}`);

      // 发送请求，跟随重定向
      const response = await axios.get(visitUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'de-AT,de;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.preisjaeger.at/',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Cache-Control': 'max-age=0',
        },
        timeout: this.timeout,
        maxRedirects: 10, // 最多跟随10次重定向
        validateStatus: (status) => status >= 200 && status < 400, // 允许重定向
      });

      // 获取最终 URL
      const finalUrl = response.request.res.responseUrl || response.config.url;

      if (!finalUrl || finalUrl === visitUrl) {
        return {
          success: false,
          originalUrl: visitUrl,
          error: '无法解析跳转链接，未获取到最终 URL',
        };
      }

      console.log(`✅ 解析成功: ${finalUrl}`);

      // 清洗 URL（去除跟踪参数、联盟码等）
      const cleanUrl = this.cleanUrl(finalUrl);
      const merchant = this.detectMerchant(cleanUrl);

      return {
        success: true,
        originalUrl: visitUrl,
        resolvedUrl: finalUrl,
        cleanUrl,
        merchant,
      };
    } catch (error) {
      const message = (error as Error).message;
      console.error(`❌ 解析失败: ${visitUrl}, 错误: ${message}`);

      return {
        success: false,
        originalUrl: visitUrl,
        error: message,
      };
    }
  }

  /**
   * 清洗 URL - 去除跟踪参数、联盟码等
   *
   * 针对不同商家的清洗策略：
   * - Amazon: 只保留 /dp/{ASIN} 格式
   * - 其他: 去除常见跟踪参数
   */
  private cleanUrl(url: string): string {
    try {
      const urlObj = new URL(url);

      // 针对 Amazon 的特殊清洗
      if (urlObj.hostname.includes('amazon.')) {
        return this.cleanAmazonUrl(urlObj);
      }

      // 通用清洗：移除常见跟踪参数
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
        'ref', 'ref_', 'tag', 'tracking', 'source', 'aff', 'affiliate',
        'fbclid', 'gclid', 'msclkid',
      ];

      trackingParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });

      return urlObj.toString();
    } catch (error) {
      console.warn(`⚠️  URL 清洗失败，返回原始 URL: ${url}`);
      return url;
    }
  }

  /**
   * 清洗 Amazon URL
   * 提取纯净的商品链接: https://www.amazon.de/dp/B0FNWKCDLS
   */
  private cleanAmazonUrl(urlObj: URL): string {
    // 提取 ASIN (Amazon Standard Identification Number)
    // 格式1: /dp/B0FNWKCDLS
    // 格式2: /gp/product/B0FNWKCDLS
    let asin: string | null = null;

    const dpMatch = urlObj.pathname.match(/\/dp\/([A-Z0-9]{10})/);
    if (dpMatch) {
      asin = dpMatch[1];
    } else {
      const gpMatch = urlObj.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/);
      if (gpMatch) {
        asin = gpMatch[1];
      }
    }

    if (!asin) {
      // 如果无法提取 ASIN，返回移除参数的 URL
      urlObj.search = '';
      return urlObj.toString();
    }

    // 构建纯净的 Amazon 链接
    const cleanUrl = `${urlObj.protocol}//${urlObj.hostname}/dp/${asin}`;
    return cleanUrl;
  }

  /**
   * 检测商家名称
   */
  private detectMerchant(url: string): string | undefined {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // Amazon
      if (hostname.includes('amazon.')) {
        const tld = hostname.split('.').pop();
        return `amazon-${tld}`;
      }

      // MediaMarkt
      if (hostname.includes('mediamarkt.')) {
        return 'mediamarkt';
      }

      // Saturn
      if (hostname.includes('saturn.')) {
        return 'saturn';
      }

      // eBay
      if (hostname.includes('ebay.')) {
        return 'ebay';
      }

      // 其他：使用主域名
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        return parts[parts.length - 2];
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * 批量解析链接（带延迟，避免被限流）
   */
  async resolveMultiple(
    visitUrls: string[],
    delayMs: number = 2000
  ): Promise<Map<string, PreisjaegerLinkResolveResult>> {
    const results = new Map<string, PreisjaegerLinkResolveResult>();

    for (let i = 0; i < visitUrls.length; i++) {
      const visitUrl = visitUrls[i];
      const result = await this.resolveLink(visitUrl);
      results.set(visitUrl, result);

      // 延迟，避免被限流（添加随机抖动模拟真实用户）
      if (i < visitUrls.length - 1) {
        const randomJitter = Math.random() * 1000; // 随机 0-1000ms
        const totalDelay = delayMs + randomJitter; // 2000-3000ms
        await new Promise(resolve => setTimeout(resolve, totalDelay));
      }
    }

    return results;
  }
}
