/**
 * Sparhamster Normalizer (v2.0 - 完全重写)
 *
 * 数据优先级策略：
 * 1. HTML 优先：标题、价格、商家、Logo、优惠码等
 * 2. API 补充：content_html、发布时间、更新时间
 * 3. 合并规则：HTML 覆盖 API
 *
 * 支持两种模式：
 * 1. normalize(apiData, htmlData) - API+HTML 混合模式
 * 2. normalizeFromHtmlOnly(htmlData) - 纯 HTML 模式（降级）
 */

import { BaseNormalizer } from './base-normalizer';
import { Deal } from '../types/deal.types';
import { HomepageArticle } from '../services/homepage-fetcher';
import { normalizeMerchant } from '../utils/merchant-normalizer';
import { normalizeCategory } from '../utils/category-normalizer';
import { parseGermanRelativeTime } from '../utils/date-parser';

/**
 * API 数据（来自 fetcher）
 */
interface ApiData {
  postId: string;
  contentHtml: string;
  publishedAt: Date;
  modifiedAt: Date;
  link: string;
}

/**
 * Sparhamster Normalizer
 */
export class SparhamsterNormalizer extends BaseNormalizer<any, Deal> {
  /**
   * 兼容 BaseNormalizer 的标准化方法（不使用）
   * 实际使用 normalize(apiData, htmlData) 或 normalizeFromHtmlOnly(htmlData)
   */
  async normalize(source: any): Promise<Deal> {
    throw new Error('Use normalize(apiData, htmlData) or normalizeFromHtmlOnly(htmlData) instead');
  }

  /**
   * 标准化方法（API + HTML 混合）
   *
   * @param apiData API 返回的数据（content_html, 时间等）
   * @param htmlData 首页 HTML 提取的数据（标题、价格、商家等）
   * @returns Deal 对象
   */
  async normalizeWithHtml(apiData: ApiData, htmlData: HomepageArticle): Promise<Deal> {
    // 1. 基础信息（HTML 优先）
    const sourcePostId = apiData.postId;
    const guid = htmlData.link || apiData.link;
    const slug = htmlData.slug || this.extractSlug(apiData.link);

    // 2. 标题（HTML 优先）
    const title = htmlData.title || undefined;
    const titleDe = title; // 德语标题

    // 3. 内容（API 提供）
    const contentHtml = apiData.contentHtml;
    const contentText = this.extractText(contentHtml);

    // 4. 商家信息（HTML 优先）
    const merchant = htmlData.merchant || undefined;
    const merchantLogo = htmlData.merchantLogo || undefined;
    const merchantLink = htmlData.merchantLink || undefined;

    // 5. 规范化商家名称
    const normalizedMerchant = normalizeMerchant(merchant);
    const canonicalMerchantId = normalizedMerchant.canonicalId;
    const canonicalMerchantName = normalizedMerchant.canonicalName;

    // 6. 价格信息（HTML 优先）
    const price = htmlData.price || undefined;
    const originalPrice = htmlData.originalPrice || undefined;
    const discount = htmlData.discount || undefined;

    // 7. 优惠码（HTML 优先）
    const couponCode = htmlData.couponCode || undefined;

    // 8. 图片（HTML 优先）
    const imageUrl = htmlData.imageUrl || undefined;
    const images = imageUrl ? [imageUrl] : [];

    // 9. 分类（HTML 优先，需要标准化）
    const rawCategories = htmlData.categories || [];

    // 标准化分类
    const normalizedCategories = rawCategories.map(catName =>
      normalizeCategory(catName, 'sparhamster')
    );

    // 只保存已映射的分类
    const mappedCategories = normalizedCategories.filter(c => c.isMatched);

    // 记录未映射的分类
    const unmappedCategories = normalizedCategories.filter(c => !c.isMatched);
    if (unmappedCategories.length > 0) {
      console.warn(`[Sparhamster] 未映射的分类: ${unmappedCategories.map(c => c.originalName).join(', ')}`);
    }

    // 如果没有任何已映射的分类，使用"其他"作为兜底
    const categories = mappedCategories.length > 0
      ? mappedCategories.map(c => c.canonicalId)
      : ['other'];

    // 10. 时间信息（HTML 优先，API 作为备选）
    const publishedAt = htmlData.publishedAt || apiData.publishedAt;
    const updatedAt = htmlData.modifiedAt || apiData.modifiedAt;

    // 11. 活动剩余时间（HTML 提供）
    const expiresIn = htmlData.expiresIn;

    // 12. 计算 content_hash（用于去重）
    const contentHash = this.calculateContentHash({
      title: title || '',
      description: contentText.substring(0, 200),
      price: price,
    });

    // 13. 构建 Deal 对象
    const deal: Deal = {
      id: '', // 由数据库生成
      sourceSite: 'sparhamster',
      sourcePostId,
      feedId: undefined,
      guid,
      slug,
      contentHash,

      // 标题和描述
      title: undefined, // 翻译后才写入
      titleDe,
      originalTitle: title,
      description: contentText.substring(0, 500),
      originalDescription: contentText.substring(0, 500),

      // 内容
      contentHtml,
      contentText,
      contentBlocks: [], // 暂不生成

      // 链接和图片
      link: merchantLink || guid,
      imageUrl,
      images,

      // 商家信息
      merchant,
      merchantLogo,
      merchantLink,
      fallbackLink: guid,

      canonicalMerchantId,
      canonicalMerchantName,

      // 联盟链接（由 AffiliateLinkService 填充）
      affiliateLink: undefined,
      affiliateEnabled: false,
      affiliateNetwork: undefined,

      // 价格信息
      price,
      originalPrice,
      discount,
      currency: 'EUR',
      couponCode,
      priceUpdateNote: undefined,
      previousPrice: undefined,

      // 分类和标签
      categories,
      tags: [],

      // 时间信息
      publishedAt,
      expiresAt: parseGermanRelativeTime(expiresIn), // 从 expiresIn 计算到期时间

      // 翻译状态
      language: 'de',
      translationStatus: 'pending',
      translationProvider: undefined,
      translationLanguage: undefined,
      translationDetectedLanguage: 'de',
      isTranslated: false,

      // 元数据
      rawPayload: { api: apiData, html: htmlData },
      duplicateCount: 0,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      createdAt: new Date(),
      updatedAt: htmlData.modifiedAt || apiData.modifiedAt || new Date(),
    };

    return deal;
  }

  /**
   * 纯 HTML 模式标准化（降级模式）
   *
   * @param htmlData 首页 HTML 提取的数据
   * @returns Deal 对象（缺少 content_html）
   */
  async normalizeFromHtmlOnly(htmlData: HomepageArticle): Promise<Deal> {
    // 1. 基础信息
    const sourcePostId = htmlData.postId;
    const guid = htmlData.link || `https://www.sparhamster.at/post/${htmlData.postId}/`;
    const slug = htmlData.slug;

    // 2. 标题
    const title = htmlData.title || undefined;
    const titleDe = title;

    // 3. 内容（缺失）
    const contentHtml = undefined; // ⚠️ 降级模式缺失
    const contentText = title || ''; // 只有标题

    // 4. 商家信息
    const merchant = htmlData.merchant || undefined;
    const merchantLogo = htmlData.merchantLogo || undefined;
    const merchantLink = htmlData.merchantLink || undefined;

    // 5. 规范化商家名称
    const normalizedMerchant = normalizeMerchant(merchant);
    const canonicalMerchantId = normalizedMerchant.canonicalId;
    const canonicalMerchantName = normalizedMerchant.canonicalName;

    // 6. 价格信息
    const price = htmlData.price || undefined;
    const originalPrice = htmlData.originalPrice || undefined;
    const discount = htmlData.discount || undefined;

    // 7. 优惠码
    const couponCode = htmlData.couponCode || undefined;

    // 8. 图片
    const imageUrl = htmlData.imageUrl || undefined;
    const images = imageUrl ? [imageUrl] : [];

    // 9. 分类（需要标准化）
    const rawCategories = htmlData.categories || [];

    // 标准化分类
    const normalizedCategories = rawCategories.map(catName =>
      normalizeCategory(catName, 'sparhamster')
    );

    // 只保存已映射的分类
    const mappedCategories = normalizedCategories.filter(c => c.isMatched);

    // 记录未映射的分类
    const unmappedCategories = normalizedCategories.filter(c => !c.isMatched);
    if (unmappedCategories.length > 0) {
      console.warn(`[Sparhamster] 未映射的分类: ${unmappedCategories.map(c => c.originalName).join(', ')}`);
    }

    // 如果没有任何已映射的分类，使用"其他"作为兜底
    const categories = mappedCategories.length > 0
      ? mappedCategories.map(c => c.canonicalId)
      : ['other'];

    // 10. 时间信息
    const publishedAt = htmlData.publishedAt || new Date();
    const expiresIn = htmlData.expiresIn; // 活动剩余时间文本

    // 11. 计算 content_hash
    const contentHash = this.calculateContentHash({
      title: title || '',
      description: '',
      price: price,
    });

    // 12. 构建 Deal 对象
    const deal: Deal = {
      id: '',
      sourceSite: 'sparhamster',
      sourcePostId,
      feedId: undefined,
      guid,
      slug,
      contentHash,

      // 标题和描述
      title: undefined,
      titleDe,
      originalTitle: title,
      description: title, // 降级模式：用标题作为描述
      originalDescription: title,

      // 内容（缺失）
      contentHtml: undefined, // ⚠️ 缺失
      contentText: contentText,
      contentBlocks: [],

      // 链接和图片
      link: merchantLink || guid,
      imageUrl,
      images,

      // 商家信息
      merchant,
      merchantLogo,
      merchantLink,
      fallbackLink: guid,

      canonicalMerchantId,
      canonicalMerchantName,

      // 联盟链接
      affiliateLink: undefined,
      affiliateEnabled: false,
      affiliateNetwork: undefined,

      // 价格信息
      price,
      originalPrice,
      discount,
      currency: 'EUR',
      couponCode,
      priceUpdateNote: undefined,
      previousPrice: undefined,

      // 分类和标签
      categories,
      tags: [],

      // 时间信息
      publishedAt,
      expiresAt: parseGermanRelativeTime(expiresIn), // 从 expiresIn 计算到期时间

      // 翻译状态
      language: 'de',
      translationStatus: 'pending',
      translationProvider: undefined,
      translationLanguage: undefined,
      translationDetectedLanguage: 'de',
      isTranslated: false,

      // 元数据
      rawPayload: { html: htmlData },
      duplicateCount: 0,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      createdAt: new Date(),
      updatedAt: htmlData.modifiedAt || new Date(),
    };

    return deal;
  }

  /**
   * 从 URL 提取 slug
   */
  protected extractSlug(url: string): string {
    const match = url.match(/\/([^\/]+)\/?$/);
    return match ? match[1] : '';
  }

  /**
   * 验证 Deal 对象（继承自 BaseNormalizer）
   */
  validate(deal: Deal): boolean {
    // 基础验证
    if (!super.validate(deal)) {
      return false;
    }

    // 必需字段验证
    const requiredFields: (keyof Deal)[] = [
      'sourceSite',
      'sourcePostId',
      'guid',
      'currency',
      'language',
      'translationStatus',
    ];

    for (const field of requiredFields) {
      if (deal[field] === undefined || deal[field] === null) {
        console.warn(`验证失败: 缺少必需字段 ${field}`);
        return false;
      }
    }

    // 至少要有标题或描述
    if (!deal.titleDe && !deal.description) {
      console.warn('验证失败: 缺少标题和描述');
      return false;
    }

    return true;
  }
}
