/**
 * Sparhamster Normalizer
 * 将 Sparhamster WordPress API 数据转换为统一的 Deal 数据模型
 */

import * as cheerio from '@moreyudeals/shared-html';
import { BaseNormalizer } from './base-normalizer';
import { WordPressPost } from '../types/wordpress.types';
import { Deal, ContentBlock } from '../types/deal.types';

/**
 * Sparhamster 数据标准化器
 * 处理 WordPress REST API 响应并转换为 Deal 对象
 */
export class SparhamsterNormalizer extends BaseNormalizer<WordPressPost, Deal> {
  /**
   * 将 WordPress Post 转换为 Deal
   */
  async normalize(post: WordPressPost): Promise<Deal> {
    // 提取文本内容
    const rawTitle = this.extractText(post.title?.rendered || '');
    const originalDescription = this.extractText(post.excerpt?.rendered || '');
    const contentHtml = post.content?.rendered || '';
    const contentText = this.extractText(contentHtml);

    // 提取价格信息
    const priceInfo = this.extractPriceInfo(`${rawTitle} ${contentText}`);

    // 清理标题：移除末尾的价格段落
    const cleanedTitle = this.cleanPriceSuffix(rawTitle);

    // originalTitle 保存原始标题，title 使用清理后的标题
    const originalTitle = rawTitle;

    // 计算 content_hash (用于去重)
    const contentHash = this.calculateContentHash({
      title: cleanedTitle,
      description: originalDescription,
      price: priceInfo.currentPrice,
    });

    // 提取商家信息
    const merchant = this.extractMerchantName(post);
    const merchantLink = this.extractMerchantLink(contentHtml);

    // 生成结构化内容块
    const contentBlocks = this.generateContentBlocks(contentHtml);

    // 提取图片
    const imageUrl = this.extractFeaturedImage(post) || this.extractImageFromHtml(contentHtml);
    const images = imageUrl ? [imageUrl] : [];

    // 提取分类
    const categories = this.extractCategories(post);

    // 提取优惠码
    const couponCode = this.extractCouponCode(contentHtml);

    // 计算过期时间 (默认 30 天)
    const publishedAt = new Date(post.date);
    const expiresAt = new Date(publishedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      id: '', // 将由数据库生成
      sourceSite: 'sparhamster',
      sourcePostId: post.id.toString(),
      feedId: undefined, // Sparhamster API 不使用 feed_id
      guid: post.link,
      slug: this.extractSlug(post.link),
      contentHash,

      title: cleanedTitle,
      originalTitle,
      description: originalDescription,
      originalDescription,

      contentHtml,
      contentText,
      contentBlocks,

      link: merchantLink || post.link,
      imageUrl: imageUrl || undefined,
      images,

      merchant,
      merchantLogo: undefined, // 待 STEP6 实现 (logo 识别)
      merchantLink: merchantLink || undefined,

      affiliateLink: undefined,
      affiliateEnabled: false,
      affiliateNetwork: undefined,

      price: priceInfo.currentPrice,
      originalPrice: priceInfo.originalPrice,
      discount: priceInfo.discountPercentage,
      currency: 'EUR',
      couponCode,

      categories,
      tags: [],

      publishedAt,
      expiresAt,

      language: 'de',
      translationStatus: 'pending',
      translationProvider: undefined,
      translationLanguage: undefined,
      translationDetectedLanguage: 'de',
      isTranslated: false,

      rawPayload: post,
      duplicateCount: 0,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * 清理标题末尾的价格描述
   * 只清理标题尾部的价格段落，标题中间的保持不动
   * 例如: "产品名称原价 167,99 欧元，现价 64,99 欧元" -> "产品名称"
   *       "产品 原价 100 欧元 something现价 50 欧元" -> "产品 原价 100 欧元 something现价 50 欧元" (中间不清理)
   */
  private cleanPriceSuffix(title: string): string {
    if (!title) return '';

    // 只匹配标题尾部的价格模式 (使用 $ 确保在末尾)
    // 注意：模式按优先级排序，先匹配更具体的模式（价格对），后匹配单独价格
    // 价格对模式：捕获前面可能的分隔符一起删除
    const tailPricePatterns = [
      // 中文模式 - 原价...现价 (末尾，完整价格对)
      // 匹配: "产品名称原价 167,99 欧元，现价 64,99 欧元" 或 "产品名称，原价 167,99 欧元，现价 64,99 欧元"
      // 捕获前面可能的逗号和空格，中间必须有分隔符（避免误匹配中间的内容）
      /[，,\s]*原价[：:\s]*\d+(?:[.,]\d+)?\s*欧元[，,\s]+现价[：:\s]*\d+(?:[.,]\d+)?\s*欧元\s*$/i,
      // 中文模式 - 现价...原价 (末尾，顺序相反)
      /[，,\s]*现价[：:\s]*\d+(?:[.,]\d+)?\s*欧元[，,\s]+原价[：:\s]*\d+(?:[.,]\d+)?\s*欧元\s*$/i,
      // 中文模式 - 单独原价 (末尾，用逗号明确分隔)
      /[，,]\s*原价[：:\s]*\d+(?:[.,]\d+)?\s*欧元\s*$/i,
      // 中文模式 - 单独现价 (末尾，用逗号明确分隔)
      /[，,]\s*现价[：:\s]*\d+(?:[.,]\d+)?\s*欧元\s*$/i,
      // 中文模式 - 价格 (末尾，用逗号明确分隔)
      /[，,]\s*价格[：:\s]*\d+(?:[.,]\d+)?\s*欧元\s*$/i,
    ];

    let cleanedTitle = title;
    for (const pattern of tailPricePatterns) {
      cleanedTitle = cleanedTitle.replace(pattern, '');
    }

    return cleanedTitle.trim();
  }

  /**
   * 提取特色图片 URL
   */
  private extractFeaturedImage(post: WordPressPost): string | null {
    const media = post._embedded?.['wp:featuredmedia'];
    if (media && media.length > 0) {
      const url = media[0].source_url;
      if (url) {
        return url;
      }
    }
    return null;
  }

  /**
   * 提取分类
   * WordPress API 返回的 _embedded['wp:term'] 包含多个分类组
   * 第一组通常是 categories, 第二组是 tags
   */
  private extractCategories(post: WordPressPost): string[] {
    const result: string[] = [];
    const terms = post._embedded?.['wp:term'];

    if (!terms) return result;

    // 遍历所有分类组
    for (const group of terms) {
      for (const term of group) {
        if (term?.name) {
          result.push(term.name);
        }
      }
    }

    // 去重
    return Array.from(new Set(result));
  }

  /**
   * 提取商家名称
   * 策略: 查找以大写字母开头的标签名
   */
  private extractMerchantName(post: WordPressPost): string | undefined {
    const tags = post._embedded?.['wp:term']?.[1]; // 第二组通常是 tags

    if (!tags) return undefined;

    // 查找以大写字母开头的标签 (通常是商家名)
    const capitalized = tags.find((tag) => /^[A-Z][A-Za-z0-9]+/.test(tag.name));
    return capitalized?.name;
  }

  /**
   * 提取商家购买链接
   * 多策略提取: forward 链接 > 优惠按钮链接 > 直接商家链接
   */
  private extractMerchantLink(content: string): string | null {
    if (!content) return null;

    const $ = cheerio.load(content);

    // 策略1: 查找 forward.sparhamster.at 转发链接 (最常见)
    const forwardLinks = $('a[href*="forward.sparhamster.at"]');
    if (forwardLinks.length > 0) {
      const href = $(forwardLinks[0]).attr('href');
      if (href) {
        return href; // 保留转发链接,它会重定向到真实商家
      }
    }

    // 策略2: 查找包含 "Zum Angebot" (前往优惠) 的链接
    const dealLinks = $('a').filter((_, el) => {
      const text = $(el).text().toLowerCase();
      const href = $(el).attr('href') || '';

      // 匹配常见的购买/优惠按钮文本
      const keywords = [
        'zum angebot',
        'zum deal',
        'jetzt kaufen',
        'direkt zum angebot',
        'hier bestellen',
        'zum shop',
      ];

      const hasKeyword = keywords.some((keyword) => text.includes(keyword));

      // 确保不是 sparhamster 自己的链接
      const isExternalLink = Boolean(
        href &&
          !href.includes('sparhamster.at/') && // 注意斜杠,允许 forward.sparhamster.at
          !href.startsWith('#') &&
          !href.startsWith('mailto:')
      );

      return hasKeyword && isExternalLink;
    });

    if (dealLinks.length > 0) {
      const href = $(dealLinks[0]).attr('href');
      if (href) {
        return href;
      }
    }

    // 策略3: 查找直接的外部商家链接 (亚马逊等)
    const directLinks = $('a').filter((_, el) => {
      const href = $(el).attr('href') || '';

      // 常见电商域名
      const merchantDomains = [
        'amazon.',
        'mediamarkt.',
        'saturn.',
        'otto.',
        'ebay.',
        'alternate.',
        'notebooksbilliger.',
      ];

      const isMerchantLink = merchantDomains.some((domain) => href.includes(domain));
      const notSocialLink =
        !href.includes('facebook.com') &&
        !href.includes('twitter.com') &&
        !href.includes('instagram.com') &&
        !href.includes('youtube.com');

      return isMerchantLink && notSocialLink;
    });

    if (directLinks.length > 0) {
      const href = $(directLinks[0]).attr('href');
      if (href) {
        return this.normalizeUrl(href);
      }
    }

    return null;
  }

  /**
   * 生成结构化内容块
   * 将 HTML 解析为 ContentBlock 数组
   */
  private generateContentBlocks(html: string): ContentBlock[] {
    if (!html) return [];

    const $ = cheerio.load(html);
    const blocks: ContentBlock[] = [];

    // 遍历 body 下的直接子元素
    $('body')
      .children()
      .each((i, elem) => {
        if (elem.type !== 'tag') return; // 跳过非标签元素

        const tagName = elem.name?.toLowerCase();
        const text = $(elem).text().trim();

        if (!text) return; // 跳过空元素

        // 标题
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          blocks.push({
            type: 'heading',
            content: text,
            metadata: { level: tagName },
          });
        }
        // 段落
        else if (tagName === 'p') {
          blocks.push({
            type: 'text',
            content: text,
          });
        }
        // 图片
        else if (tagName === 'img') {
          const src = $(elem).attr('src');
          if (src) {
            blocks.push({
              type: 'image',
              content: src,
              metadata: { alt: $(elem).attr('alt') },
            });
          }
        }
        // 列表
        else if (['ul', 'ol'].includes(tagName)) {
          const items = $(elem)
            .find('li')
            .map((_, li) => $(li).text().trim())
            .get();

          blocks.push({
            type: 'list',
            content: items.join('\n'),
            metadata: { ordered: tagName === 'ol' },
          });
        }
        // 代码块
        else if (['pre', 'code'].includes(tagName)) {
          blocks.push({
            type: 'code',
            content: text,
          });
        }
        // 引用
        else if (tagName === 'blockquote') {
          blocks.push({
            type: 'quote',
            content: text,
          });
        }
      });

    return blocks;
  }

  /**
   * 提取优惠码
   * 策略: 查找高亮文本中的大写字母+数字组合
   */
  private extractCouponCode(html: string): string | undefined {
    if (!html) return undefined;

    const $ = cheerio.load(html);

    // 策略1: 查找包含 "Code" 或 "Gutschein" 的高亮文本
    const codeElements = $('strong, b, code, span.coupon').filter((_, el) => {
      const text = $(el).text();
      return /code|gutschein|rabatt/i.test(text) && /[A-Z0-9]{5,}/.test(text);
    });

    if (codeElements.length > 0) {
      const match = $(codeElements[0]).text().match(/[A-Z0-9]{5,}/);
      return match ? match[0] : undefined;
    }

    // 策略2: 正则匹配常见格式
    const match = html.match(/(?:Code|Gutschein|Rabatt)[:\s]*([A-Z0-9]{5,})/i);
    return match ? match[1] : undefined;
  }

  /**
   * 验证 Deal 对象的完整性
   * 确保必需字段都有值
   */
  validate(deal: Deal): boolean {
    // 基础验证
    if (!super.validate(deal)) {
      return false;
    }

    // 必需字段验证
    const requiredFields: (keyof Deal)[] = [
      'sourceSite',
      'guid',
      'link',
      'currency',
      'language',
      'affiliateEnabled',
      'isTranslated',
      'translationStatus',
      'duplicateCount',
      'firstSeenAt',
      'lastSeenAt',
    ];

    for (const field of requiredFields) {
      if (deal[field] === undefined || deal[field] === null) {
        console.warn(`验证失败: 缺少必需字段 ${field}`);
        return false;
      }
    }

    return true;
  }
}
