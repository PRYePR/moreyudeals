/**
 * Base Normalizer - 数据标准化基类
 * 提供通用的数据转换和验证功能
 */

import * as crypto from 'crypto';
import { load as cheerioLoad } from '@moreyudeals/shared-html';

// 兼容旧代码的 cheerio 命名空间
const cheerio = { load: cheerioLoad };

/**
 * Normalizer 接口定义
 */
export interface INormalizer<TSource, TTarget> {
  /**
   * 将源数据转换为目标数据模型
   */
  normalize(source: TSource): Promise<TTarget>;

  /**
   * 验证转换后的数据是否有效
   */
  validate(target: TTarget): boolean;
}

/**
 * Base Normalizer 抽象类
 * 提供通用的辅助方法
 */
export abstract class BaseNormalizer<TSource, TTarget> implements INormalizer<TSource, TTarget> {
  /**
   * 子类必须实现的标准化方法
   */
  abstract normalize(source: TSource): Promise<TTarget>;

  /**
   * 验证目标数据
   * 子类可以重写以实现自定义验证逻辑
   */
  validate(target: TTarget): boolean {
    // 基础验证: 检查对象是否非空
    return target !== null && target !== undefined;
  }

  /**
   * 清理 HTML 标签,保留纯文本
   * @param html HTML 字符串
   * @returns 纯文本字符串
   */
  protected extractText(html: string): string {
    if (!html) return '';

    const $ = cheerio.load(html);
    return $('body').text().replace(/\s+/g, ' ').trim();
  }

  /**
   * 清理 HTML,移除危险标签
   * @param html HTML 字符串
   * @returns 清理后的 HTML
   */
  protected sanitizeHtml(html: string): string {
    if (!html) return '';

    const $ = cheerio.load(html);

    // 移除危险标签
    $('script, style, iframe, object, embed').remove();

    // 移除危险属性
    $('*').each((_, elem) => {
      const $elem = $(elem);
      // 移除 on* 事件属性
      if (elem.type === 'tag') {
        const attrs = elem.attribs || {};
        Object.keys(attrs).forEach(attr => {
          if (attr.startsWith('on')) {
            $elem.removeAttr(attr);
          }
        });
      }
    });

    return $.html();
  }

  /**
   * 计算内容哈希 (用于去重)
   * 基于标题、描述和价格生成 MD5 哈希的前 16 位
   *
   * @param content 内容对象
   * @returns 16 位哈希字符串
   */
  protected calculateContentHash(content: {
    title?: string;
    description?: string;
    price?: number;
  }): string {
    const raw = `${content.title || ''}|${content.description || ''}|${content.price || ''}`;
    return crypto.createHash('md5').update(raw, 'utf8').digest('hex').substring(0, 16);
  }

  /**
   * 提取 URL 的 slug 部分
   * @param url 完整 URL
   * @returns slug 字符串
   */
  protected extractSlug(url: string): string {
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      return parts[parts.length - 1] || '';
    } catch {
      // URL 解析失败,使用简单的字符串分割
      const parts = url.split('/').filter(Boolean);
      return parts[parts.length - 1] || '';
    }
  }

  /**
   * 标准化 URL (移除不必要的参数)
   * @param url 原始 URL
   * @returns 清理后的 URL
   */
  protected normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);

      // 如果是 Amazon 链接,保留 tag 参数 (affiliate)
      if (urlObj.hostname.includes('amazon')) {
        const tag = urlObj.searchParams.get('tag');
        if (tag) {
          return `${urlObj.origin}${urlObj.pathname}?tag=${tag}`;
        }
      }

      // 对于其他链接,返回基础 URL + search
      return `${urlObj.origin}${urlObj.pathname}${urlObj.search}`;
    } catch {
      // URL 解析失败,返回原始 URL
      return url;
    }
  }

  /**
   * 从 HTML 中提取第一张图片 URL
   * @param html HTML 字符串
   * @returns 图片 URL 或 null
   */
  protected extractImageFromHtml(html: string): string | null {
    if (!html) return null;

    const $ = cheerio.load(html);
    const img = $('img').first();
    return img.attr('src') || null;
  }

  /**
   * 从 HTML 中提取所有图片 URL
   * @param html HTML 字符串
   * @returns 图片 URL 数组
   */
  protected extractAllImagesFromHtml(html: string): string[] {
    if (!html) return [];

    const $ = cheerio.load(html);
    const images: string[] = [];

    $('img').each((_, elem) => {
      const src = $(elem).attr('src');
      if (src) {
        images.push(src);
      }
    });

    return images;
  }

  /**
   * 提取价格信息 (通用逻辑)
   * 使用模式匹配来识别价格对，避免运费等干扰
   * @param text 文本内容 (标题 + 描述)
   * @returns 价格信息对象
   */
  protected extractPriceInfo(text: string): {
    currentPrice?: number;
    originalPrice?: number;
    discountPercentage?: number;
  } {
    if (!text) return {};

    // 尝试提取折扣价格对
    const discountPrice = this.extractDiscountPricePair(text);
    if (discountPrice) {
      return discountPrice;
    }

    // 如果没有找到折扣价格对，提取单个价格
    const singlePrice = this.extractSinglePrice(text);
    const discountPercentage = this.extractDiscountPercentage(text);

    if (singlePrice !== null) {
      // 返回单个价格时，同时保留折扣百分比（如果有）
      return discountPercentage
        ? { currentPrice: singlePrice, discountPercentage }
        : { currentPrice: singlePrice };
    }

    // 即使没有价格，也返回折扣百分比（如果有）
    return discountPercentage ? { discountPercentage } : {};
  }

  /**
   * 提取折扣价格对
   * 支持的模式：
   * - "84,99€ statt 123,59€" (现价 statt 原价)
   * - "um/für 84,99€ statt 123,59€"
   * - "von 123,59€ auf 84,99€" (原价 auf 现价)
   * - "ursprünglich 123,59€ jetzt 84,99€"
   * - "UVP: 123,59€ Preis: 84,99€"
   * - "(Original: 29.99€) ... 19.99€" 或 "19.99€ (Original: 29.99€)"
   * - "Was 99.99€, now only 59.99€"
   */
  private extractDiscountPricePair(text: string): {
    currentPrice: number;
    originalPrice: number;
    discountPercentage: number;
  } | null {
    const pricePatterns = [
      // "84,99€ statt 123,59€" -> currentPrice=84.99, originalPrice=123.59
      {
        regex: /(?:um|für)?\s*(\d+(?:[.,]\d+)?)\s*€\s+statt\s+(\d+(?:[.,]\d+)?)\s*€/i,
        currentIndex: 1,
        originalIndex: 2,
      },
      // "von 123,59€ auf 84,99€" -> originalPrice=123.59, currentPrice=84.99
      {
        regex: /von\s+(\d+(?:[.,]\d+)?)\s*€\s+auf\s+(\d+(?:[.,]\d+)?)\s*€/i,
        currentIndex: 2,
        originalIndex: 1,
      },
      // "ursprünglich 123,59€ ... jetzt 84,99€"
      {
        regex: /ursprünglich\s+(\d+(?:[.,]\d+)?)\s*€.*?jetzt\s+(\d+(?:[.,]\d+)?)\s*€/i,
        currentIndex: 2,
        originalIndex: 1,
      },
      // "UVP: 123,59€ ... Preis: 84,99€"
      {
        regex: /UVP:?\s+(\d+(?:[.,]\d+)?)\s*€.*?Preis:?\s+(\d+(?:[.,]\d+)?)\s*€/i,
        currentIndex: 2,
        originalIndex: 1,
      },
      // "19.99€ (Original: 29.99€)" or similar
      {
        regex: /(\d+(?:[.,]\d+)?)\s*€.*?\(Original:\s*(\d+(?:[.,]\d+)?)\s*€\)/i,
        currentIndex: 1,
        originalIndex: 2,
      },
      // "Was 99.99€, now only 59.99€" or similar
      {
        regex: /Was\s+(\d+(?:[.,]\d+)?)\s*€.*?(?:now|only)\s+(\d+(?:[.,]\d+)?)\s*€/i,
        currentIndex: 2,
        originalIndex: 1,
      },
    ];

    for (const pattern of pricePatterns) {
      const match = text.match(pattern.regex);
      if (match) {
        const currentPrice = parseFloat(match[pattern.currentIndex].replace(',', '.'));
        const originalPrice = parseFloat(match[pattern.originalIndex].replace(',', '.'));

        // 确保现价 < 原价才是有效折扣
        if (!Number.isNaN(currentPrice) && !Number.isNaN(originalPrice) && currentPrice < originalPrice) {
          const discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
          return {
            currentPrice,
            originalPrice,
            discountPercentage,
          };
        }
      }
    }

    return null;
  }

  /**
   * 提取单个价格
   * 排除运费、比较价等干扰价格
   */
  private extractSinglePrice(text: string): number | null {
    // 排除常见的干扰模式（带上下文）
    const excludePatterns = [
      /versand(?:kosten|pauschale)?.*?(\d+(?:[.,]\d+)?)\s*€/gi,  // 运费、邮费固定费用
      /(?:bis\s+zu\s+)?(\d+(?:[.,]\d+)?)\s*€\s*versand(?:kosten|pauschale)?/gi,  // "2,99 € Versandkosten" 或 "bis zu 69 € Versandkosten"
      /speditions(?:kosten|gebühr).*?(\d+(?:[.,]\d+)?)\s*€/gi,   // 物流费用
      /(?:bis\s+zu\s+)?(\d+(?:[.,]\d+)?)\s*€\s*speditions(?:kosten|gebühr)/gi,  // "bis zu 69 € Speditionskosten"
      /shipping.*?(\d+(?:[.,]\d+)?)\s*€/gi,                      // shipping cost
      /porto.*?(\d+(?:[.,]\d+)?)\s*€/gi,                         // 邮费
      /gebühr.*?(\d+(?:[.,]\d+)?)\s*€/gi,                        // 费用
      /vergleichspreis.*?(\d+(?:[.,]\d+)?)\s*€/gi,               // 比较价
      /liefer(?:kosten|gebühr).*?(\d+(?:[.,]\d+)?)\s*€/gi,       // 配送费
      /(?:bis\s+zu\s+)?(\d+(?:[.,]\d+)?)\s*€\s*liefer(?:kosten|gebühr)/gi,  // "2,99 € Lieferkosten"
    ];

    let cleanText = text;
    for (const pattern of excludePatterns) {
      cleanText = cleanText.replace(pattern, '');
    }

    // 提取所有价格
    const priceRegex = /(\d+(?:[.,]\d+)?)\s*€/g;
    const matches = Array.from(cleanText.matchAll(priceRegex));

    if (matches.length === 0) {
      return null;
    }

    // 如果只有一个价格，直接返回
    if (matches.length === 1) {
      return parseFloat(matches[0][1].replace(',', '.'));
    }

    // 多个价格时，选择最大值（通常是产品主价格）
    // 排除明显过大的异常值（>10000€）
    const prices = matches
      .map(m => parseFloat(m[1].replace(',', '.')))
      .filter(p => !Number.isNaN(p) && p > 0 && p < 10000)
      .sort((a, b) => b - a);  // 降序排序

    return prices.length > 0 ? prices[0] : null;
  }

  /**
   * 提取折扣百分比
   */
  private extractDiscountPercentage(text: string): number | undefined {
    const discountRegex = /(\d+)\s*%/;
    const match = discountRegex.exec(text);
    return match ? Number(match[1]) : undefined;
  }
}
