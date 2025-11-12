/**
 * Preisjaeger Normalizer
 *
 * 负责将 Preisjaeger.at 的数据标准化为 Deal 对象
 *
 * 数据来源：
 * 1. 列表页数据（data-vue3 属性中的 JSON）
 * 2. 详情页数据（window.__INITIAL_STATE__.threadDetail）
 *
 * 字段映射策略：
 * - threadId → sourcePostId
 * - shareableLink → guid
 * - title → titleDe / originalTitle
 * - merchant.merchantName → merchant
 * - mainGroup.threadGroupName → categories
 * - price / nextBestPrice → price / originalPrice
 * - cpcLink → merchantLink (需联盟链接处理)
 * - mainImage → imageUrl (需拼接完整URL)
 */

import { BaseNormalizer } from './base-normalizer';
import { Deal } from '../types/deal.types';
import { normalizeMerchant } from '../utils/merchant-normalizer';
import { normalizeCategory } from '../utils/category-normalizer';
import { AffiliateLinkService } from '../services/affiliate-link-service';
import { PreisjaegerLinkResolver } from '../services/preisjaeger-link-resolver';
import { parseGermanRelativeTime } from '../utils/date-parser';

/**
 * Preisjaeger 列表页数据结构（来自 data-vue3）
 */
export interface PreisjaegerListItem {
  threadId: string;
  title: string;
  titleSlug: string;
  shareableLink: string;
  linkHost?: string;
  merchant?: {
    merchantId: number;
    merchantName: string;
    merchantUrlName: string;
  };
  mainGroup?: {
    threadGroupId: number;
    threadGroupName: string;
    threadGroupUrlName: string;
  };
  mainImage?: {
    path: string;
    name: string;
    width?: number;
    height?: number;
    uid?: string;
    ext?: string;
  };
  price?: number;
  nextBestPrice?: number;
  voucherCode?: string;
  shipping?: {
    isFree?: number;
    price?: number;
  };
  publishedAt?: number; // Unix timestamp
  updatedAt?: number;
  temperature?: number;
  temperatureLevel?: string;
  status?: string;
  isExpired?: boolean;

  // Metadata (包含简短描述)
  metadata?: {
    title?: string;
    description?: string; // 用作临时 description
  };

  // 从 HTML 提取的字段
  descriptionHtml?: string; // 从列表页 metadata 或详情页提取的描述
  expiresIn?: string; // 从 "Läuft ab in XStd YMin" 提取的倒计时
  linkCloakedItemMainButton?: string; // 列表页的 "zum Deal" 按钮链接
}

/**
 * Preisjaeger 详情页数据结构（来自 window.__INITIAL_STATE__.threadDetail）
 */
export interface PreisjaegerDetailItem extends PreisjaegerListItem {
  preparedHtmlDescription?: string; // HTML 内容
  description?: string; // 纯文本描述
  groups?: Array<{ // 多个分类
    threadGroupId: number;
    threadGroupName: string;
    threadGroupUrlName: string;
  }>;
  cpcLink?: string; // 商家联盟链接
  url?: string; // Preisjaeger 详情页 URL
  link?: string; // 原始链接（通常为空）
}

/**
 * Preisjaeger Normalizer
 */
export class PreisjaegerNormalizer extends BaseNormalizer<PreisjaegerDetailItem, Deal> {
  private affiliateLinkService: AffiliateLinkService;
  private linkResolver: PreisjaegerLinkResolver;

  constructor() {
    super();
    this.affiliateLinkService = new AffiliateLinkService();
    this.linkResolver = new PreisjaegerLinkResolver();
  }

  /**
   * 标准化方法（处理详情页完整数据）
   *
   * @param source - Preisjaeger 详情页数据
   * @returns Deal 对象
   */
  async normalize(source: PreisjaegerDetailItem): Promise<Deal> {
    // 1. 基础信息
    const sourcePostId = source.threadId;
    const guid = source.shareableLink; // 如: https://www.preisjaeger.at/share-deal/354419
    const slug = source.titleSlug;

    // 2. 标题（德语原文）
    const title = source.title;
    const titleDe = title; // 德语标题
    const originalTitle = title; // 保留原始标题

    // 3. 内容处理
    // 优先级：preparedHtmlDescription（详情页） > descriptionHtml（列表页元数据） > description（文本）
    const contentHtml = source.preparedHtmlDescription || source.descriptionHtml || undefined;
    const contentText = source.description || (contentHtml ? this.extractText(contentHtml) : '');

    // 描述：截取前500字符作为摘要
    const description = contentText ? contentText.substring(0, 500) : '';
    const originalDescription = description;

    // 4. 商家信息
    const merchant = source.merchant?.merchantName || source.linkHost || undefined;
    const merchantLogo = undefined; // Preisjaeger 未提供商家 Logo URL

    // 5. 构建商家链接：优先使用 cpcLink（详情页），否则构建 /visit/homenew/ 链接
    let merchantLink: string | undefined;
    let resolvedMerchantLink: string | undefined; // 解析后的真实链接

    if (source.cpcLink) {
      // 详情页有直接链接
      merchantLink = source.cpcLink;
      console.log(`   ℹ️  使用详情页 cpcLink: ${merchantLink}`);
    } else if (source.linkCloakedItemMainButton) {
      // 列表页有按钮链接
      merchantLink = source.linkCloakedItemMainButton;
      console.log(`   ℹ️  使用列表页按钮链接: ${merchantLink}`);
    } else if (source.threadId) {
      // 使用加密跳转链接
      merchantLink = `https://www.preisjaeger.at/visit/homenew/${source.threadId}`;
      console.log(`   ℹ️  使用加密跳转链接: ${merchantLink}`);
    } else {
      merchantLink = source.link;
    }

    // 6. 解析加密跳转链接（仅在需要时）
    if (merchantLink && merchantLink.includes('/visit/homenew/')) {
      try {
        console.log(`   🔗 解析加密跳转链接...`);
        const resolveResult = await this.linkResolver.resolveLink(merchantLink);

        if (resolveResult.success && resolveResult.cleanUrl) {
          resolvedMerchantLink = resolveResult.cleanUrl;
          console.log(`   ✅ 解析成功: ${resolvedMerchantLink}`);

          // 更新 merchantLink 为解析后的干净链接
          merchantLink = resolvedMerchantLink;
        } else {
          console.warn(`   ⚠️  解析失败，保留原链接: ${resolveResult.error}`);
        }
      } catch (error) {
        console.warn(`   ⚠️  解析异常: ${(error as Error).message}`);
      }
    }

    // 7. 规范化商家名称
    const normalizedMerchant = normalizeMerchant(merchant);
    const canonicalMerchantId = normalizedMerchant.canonicalId;
    const canonicalMerchantName = normalizedMerchant.canonicalName;

    // 8. 处理联盟链接（针对 Amazon 等支持联盟的商家）
    let affiliateLink: string | undefined = undefined;
    let affiliateEnabled = false;
    let affiliateNetwork: string | undefined = undefined;

    if (merchantLink && normalizedMerchant.isMatched) {
      try {
        const affiliateResult = await this.affiliateLinkService.processAffiliateLink(
          merchant,
          canonicalMerchantName,
          merchantLink
        );

        if (affiliateResult.enabled && affiliateResult.affiliateLink) {
          affiliateLink = affiliateResult.affiliateLink;
          affiliateEnabled = true;
          affiliateNetwork = affiliateResult.network;
          console.log(`   ✅ 联盟链接已添加: ${merchant} -> ${affiliateLink}`);
        }
      } catch (error) {
        console.warn(`   ⚠️  联盟链接处理失败 (${merchant}):`, error);
      }
    }

    // 9. 价格信息
    const price = source.price !== undefined ? source.price : undefined;
    const originalPrice = source.nextBestPrice !== undefined ? source.nextBestPrice : undefined;

    // 计算折扣百分比
    let discount: number | undefined = undefined;
    if (price !== undefined && originalPrice !== undefined && originalPrice > 0) {
      discount = Math.round(((originalPrice - price) / originalPrice) * 100);
    }

    // 8. 优惠码
    const couponCode = source.voucherCode || undefined;

    // 9. 图片 URL 拼接
    const imageUrl = this.buildImageUrl(source.mainImage);
    const images = imageUrl ? [imageUrl] : [];

    // 10. 分类处理
    const categoryNames = source.groups?.map(g => g.threadGroupName) ||
                          (source.mainGroup ? [source.mainGroup.threadGroupName] : []);

    const normalizedCategories = categoryNames.map(catName =>
      normalizeCategory(catName, 'preisjaeger')
    );

    const categories = normalizedCategories.map(c => c.canonicalId);
    const categoriesRaw = categoryNames; // 保留原始分类名称

    // 11. 时间信息
    const publishedAt = source.publishedAt
      ? new Date(source.publishedAt * 1000) // Unix timestamp 转 Date
      : undefined;

    const updatedAt = source.updatedAt
      ? new Date(source.updatedAt * 1000)
      : undefined;

    // 12. 过期时间 - 使用 parseGermanRelativeTime 解析倒计时
    const expiresAt = source.expiresIn
      ? parseGermanRelativeTime(source.expiresIn, new Date())
      : undefined;

    // 12. 计算 content_hash（用于去重）
    const contentHash = this.calculateContentHash({
      title: title || '',
      description: contentText.substring(0, 200),
      price: price,
    });

    // 13. 构建 Deal 对象
    const deal: Deal = {
      id: '', // 由数据库生成
      sourceSite: 'preisjaeger',
      sourcePostId,
      feedId: undefined,
      guid,
      slug,
      contentHash,

      // 标题和描述
      title: undefined, // 翻译后才写入
      titleDe,
      originalTitle,
      description: contentText.substring(0, 500),
      originalDescription: contentText.substring(0, 500),

      // 内容
      contentHtml,
      contentText,
      contentBlocks: [], // 暂不生成

      // 链接和图片
      link: merchantLink || guid, // 优先使用商家链接
      imageUrl,
      images,

      // 商家信息
      merchant,
      merchantLogo,
      merchantLink,
      fallbackLink: guid, // 分享链接作为备选

      canonicalMerchantId,
      canonicalMerchantName,

      // 联盟链接
      affiliateLink,
      affiliateEnabled,
      affiliateNetwork,

      // 价格信息
      price,
      originalPrice,
      discount,
      currency: 'EUR', // Preisjaeger 使用欧元
      couponCode,
      priceUpdateNote: undefined,
      previousPrice: undefined,

      // 分类和标签
      categories,
      tags: [],

      // 时间信息
      publishedAt,
      expiresAt, // 从倒计时计算的过期时间

      // 翻译状态
      language: 'de',
      translationStatus: 'pending',
      translationProvider: undefined,
      translationLanguage: undefined,
      translationDetectedLanguage: 'de',
      isTranslated: false,

      // 元数据
      rawPayload: {
        source,
        categoriesRaw, // 保留原始分类
      },
      duplicateCount: 0,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      createdAt: new Date(),
      updatedAt: updatedAt || new Date(),
    };

    return deal;
  }

  /**
   * 从列表页数据快速标准化（可选，用于只抓列表页的场景）
   *
   * @param listItem - Preisjaeger 列表页数据
   * @returns Deal 对象（缺少详细内容）
   */
  async normalizeFromList(listItem: PreisjaegerListItem): Promise<Deal> {
    // 复用 normalize 方法，但传入的数据缺少详情
    return this.normalize(listItem as PreisjaegerDetailItem);
  }

  /**
   * 拼接图片 URL
   *
   * 规则：https://static.preisjaeger.at/{path}/{name}/re/768x768/qt/60/{name}.{ext}
   *
   * @param mainImage - 图片信息对象
   * @returns 完整的图片 URL
   */
  private buildImageUrl(mainImage?: PreisjaegerListItem['mainImage']): string | undefined {
    if (!mainImage || !mainImage.path || !mainImage.name) {
      return undefined;
    }

    const { path, name, ext, uid } = mainImage;

    // 推荐尺寸：768x768，质量：60
    const size = '768x768';
    const quality = '60';

    // 确定文件扩展名
    let extension = ext || 'jpg';

    // 如果 uid 包含扩展名，使用 uid 的扩展名
    if (uid && uid.includes('.')) {
      const uidExt = uid.split('.').pop();
      if (uidExt) {
        extension = uidExt;
      }
    }

    // 拼接 URL
    const imageUrl = `https://static.preisjaeger.at/${path}/${name}/re/${size}/qt/${quality}/${name}.${extension}`;

    return imageUrl;
  }

  /**
   * 验证 Deal 对象
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

    // 至少要有标题
    if (!deal.titleDe && !deal.originalTitle) {
      console.warn('验证失败: 缺少标题');
      return false;
    }

    // sourceSite 必须是 'preisjaeger'
    if (deal.sourceSite !== 'preisjaeger') {
      console.warn(`验证失败: sourceSite 应为 'preisjaeger'，实际为 '${deal.sourceSite}'`);
      return false;
    }

    return true;
  }
}
