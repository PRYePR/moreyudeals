/**
 * Sparhamster Normalizer
 * 将 Sparhamster WordPress API 数据转换为统一的 Deal 数据模型
 */

import * as cheerio from '@moreyudeals/shared-html';
import { BaseNormalizer } from './base-normalizer';
import { WordPressPost } from '../types/wordpress.types';
import { Deal, ContentBlock } from '../types/deal.types';
import { getMerchantLogo } from '../config/merchant-logos';
import { normalizeMerchant } from '../utils/merchant-normalizer';

/**
 * Sparhamster 数据标准化器
 * 处理 WordPress REST API 响应并转换为 Deal 对象
 */
export class SparhamsterNormalizer extends BaseNormalizer<WordPressPost, Deal> {
  /**
   * 将 WordPress Post 转换为 Deal
   * @param post WordPress API 返回的帖子数据
   * @param options 可选参数
   * @param options.fullHtml 完整页面HTML（用于提取API数据中不包含的信息，如商家链接）
   */
  async normalize(post: WordPressPost, options?: { fullHtml?: string | null }): Promise<Deal> {
    // 提取文本内容
    const rawTitle = this.extractText(post.title?.rendered || '');
    const originalDescription = this.extractText(post.excerpt?.rendered || '');
    const contentHtml = post.content?.rendered || '';
    const contentText = this.extractText(contentHtml);

    // 提取 .box-info 价格更新信息（最高优先级）
    const priceUpdate = this.extractPriceUpdate(contentHtml);

    // 优先从 hero 区块提取价格信息
    let priceInfo = this.extractPriceFromHero(contentHtml);

    // 如果 hero 区块没有找到价格，但 .box-info 有，使用 .box-info
    if (!priceInfo.currentPrice && !priceInfo.originalPrice && priceUpdate?.current) {
      priceInfo = {
        currentPrice: priceUpdate.current,
        originalPrice: priceUpdate.previous,
      };

      // 回退后重新计算折扣
      if (priceInfo.currentPrice && priceInfo.originalPrice) {
        priceInfo.discountPercentage = Math.round(
          ((priceInfo.originalPrice - priceInfo.currentPrice) / priceInfo.originalPrice) * 100
        );
      }
    }

    // 如果都没有找到，使用全文提取
    if (!priceInfo.currentPrice && !priceInfo.originalPrice) {
      priceInfo = this.extractPriceInfo(`${rawTitle} ${contentText}`);
    }

    // 统一计算折扣百分比（如果还没有但有现价和原价）
    if (!priceInfo.discountPercentage && priceInfo.currentPrice && priceInfo.originalPrice) {
      priceInfo.discountPercentage = Math.round(
        ((priceInfo.originalPrice - priceInfo.currentPrice) / priceInfo.originalPrice) * 100
      );
    }

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

    // 提取商家信息（新优先级）
    // 1. 优先从 _embedded['wp:term'] 提取（最准确）
    let merchantInfo = this.extractMerchantFromEmbedded(post);

    // 2. 如果 _embedded 没找到，从 content.rendered 提取（Bei <strong>商家</strong> 模式）
    if (!merchantInfo) {
      merchantInfo = this.extractMerchantFromContent(contentHtml);
    }

    const merchant = merchantInfo?.merchant;
    const merchantLogo = merchantInfo?.logo;

    // 规范化商家名称（统一不同站点的商家写法）
    const normalizedMerchant = normalizeMerchant(merchant);
    const canonicalMerchantId = normalizedMerchant.canonicalId;
    const canonicalMerchantName = normalizedMerchant.canonicalName;

    // 不再从 content.rendered 提取 forward 链接
    // merchantLink 和 merchantLogo 将从首页 HTML 获取，此处初始化为 undefined
    const merchantLink = undefined;

    // fallbackLink 使用文章 URL 作为临时跳转
    const fallbackLink = post.link;

    // 检测联盟信息（传入商家名称以帮助判断）
    const affiliateInfo = this.detectAffiliateInfo(merchantLink || undefined, merchant);

    // 生成结构化内容块
    const contentBlocks = this.generateContentBlocks(contentHtml);

    // 提取图片（只取 wp-content 直链）
    const imageUrl = this.extractProductImage(contentHtml) ||
                    this.extractFeaturedImage(post);
    const images = imageUrl ? [imageUrl] : [];

    // 提取分类（优先从 HTML 提取，否则从 _embedded 提取）
    let categories = this.extractCategoriesFromHtml(contentHtml);
    if (categories.length === 0) {
      categories = this.extractCategories(post);
    }

    // 提取优惠码
    const couponCode = this.extractCouponCode(contentHtml);

    // 提取发布时间（优先使用 ISO 格式）
    const publishedAt = this.extractPublishTime(contentHtml) || new Date(post.date);

    // 过期时间（如果能从内容中提取到则填充，否则保持为 undefined）
    // 不再填写默认的 30 天，让前端根据是否有过期时间来决定显示逻辑
    const expiresAt = undefined; // TODO: 可以添加从 HTML 中提取过期时间的逻辑

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
      merchantLogo,
      merchantLink: merchantLink || undefined,
      fallbackLink,

      canonicalMerchantId,
      canonicalMerchantName,

      affiliateLink: affiliateInfo?.affiliateLink,
      affiliateEnabled: affiliateInfo?.enabled || false,
      affiliateNetwork: affiliateInfo?.network,

      price: priceInfo.currentPrice,
      originalPrice: priceInfo.originalPrice,
      discount: priceInfo.discountPercentage,
      currency: 'EUR',
      couponCode,
      priceUpdateNote: priceUpdate?.note,
      previousPrice: priceUpdate?.previous,

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
   * 清理德语价格文本，支持千位分隔符
   * 德语格式: 1.108,24 (千位用点，小数用逗号)
   *
   * 算法：
   * 1. 删除所有空格
   * 2. 找到最后一个分隔符（. 或 ,）
   * 3. 如果最后一个分隔符后面正好是 2 位数字，则为小数点，其他分隔符为千位分隔符
   * 4. 删除千位分隔符，将小数分隔符替换为 .
   *
   * 示例:
   *   "1.108,24" -> 1108.24
   *   "1.519,89" -> 1519.89
   *   "3,49" -> 3.49
   *   "25" -> 25
   *   "1 519,89" -> 1519.89
   *   "1.519.000,99" -> 1519000.99
   */
  private sanitizePriceText(priceText: string): number {
    if (!priceText) return 0;

    // 1. 删除所有空格
    let cleaned = priceText.replace(/\s+/g, '');

    // 2. 找到最后一个分隔符的位置
    const lastCommaIdx = cleaned.lastIndexOf(',');
    const lastDotIdx = cleaned.lastIndexOf('.');
    const lastSepIdx = Math.max(lastCommaIdx, lastDotIdx);

    // 3. 如果没有分隔符，直接转换
    if (lastSepIdx === -1) {
      return parseFloat(cleaned) || 0;
    }

    // 4. 检查最后一个分隔符后面有多少位数字
    const afterSep = cleaned.substring(lastSepIdx + 1);

    // 如果最后分隔符后正好是 2 位数字（或 1 位），则为小数分隔符
    // 德语格式：1.108,24 或 3,5
    if (afterSep.length <= 2) {
      // 最后一个是小数分隔符
      // 删除所有之前的分隔符，将最后的分隔符替换为 .
      const beforeSep = cleaned.substring(0, lastSepIdx).replace(/[.,]/g, '');
      cleaned = beforeSep + '.' + afterSep;
    } else {
      // 最后分隔符不是小数点（如 1.519），删除所有分隔符
      cleaned = cleaned.replace(/[.,]/g, '');
    }

    return parseFloat(cleaned) || 0;
  }

  /**
   * 清理标题末尾的价格描述
   * **仅移除标题结尾的完整价格对（原价...现价 或 现价...原价）**
   * 不移除单独的"原价"、"现价"或"价格"词
   *
   * 例如:
   *   "产品名称原价 167,99 欧元，现价 64,99 欧元" -> "产品名称"
   *   "产品名称，原价 100 欧元" -> "产品名称，原价 100 欧元" (保留，因为不是完整价格对)
   *   "产品 原价 100 欧元 something现价 50 欧元" -> "产品 原价 100 欧元 something现价 50 欧元" (中间不清理)
   *   "SodaStream Sirupe 440ml um 3,49 € statt 5,03 €" -> "SodaStream Sirupe 440ml"
   */
  private cleanPriceSuffix(title: string): string {
    if (!title) return '';

    // 只匹配标题尾部的完整价格对 (使用 $ 确保在末尾)
    // 价格对定义：必须同时包含"原价 X 欧元"和"现价 Y 欧元"
    const tailPricePairPatterns = [
      // 中文模式 - 原价...现价 (末尾，完整价格对)
      // 匹配: "产品名称原价 167,99 欧元，现价 64,99 欧元" 或 "产品名称，原价 167,99 欧元，现价 64,99 欧元"
      // 捕获前面可能的逗号和空格，中间必须有分隔符
      /[，,\s]*原价[：:\s]*\d+(?:[.,]\d+)?\s*欧元[，,\s]+现价[：:\s]*\d+(?:[.,]\d+)?\s*欧元\s*$/i,

      // 中文模式 - 现价...原价 (末尾，顺序相反)
      /[，,\s]*现价[：:\s]*\d+(?:[.,]\d+)?\s*欧元[，,\s]+原价[：:\s]*\d+(?:[.,]\d+)?\s*欧元\s*$/i,

      // 德语模式 1: um <价格> statt <价格>
      // 匹配: "Product um 3,49 € statt 5,03 €" 和 "Product um 1.108,24 € statt 1.519,89 €"
      // 支持德语千位分隔符(.)和小数分隔符(,): 1.108,24
      /\s+um\s+\d+(?:\.\d{3})*(?:,\d+)?\s*(?:€|EUR)\s+statt\s+\d+(?:\.\d{3})*(?:,\d+)?\s*(?:€|EUR)\s*$/i,

      // 德语模式 2: für <价格> statt <价格>
      // 匹配: "Product für 19,99 € statt 39,99 €" 和带千位分隔符的价格
      /\s+für\s+\d+(?:\.\d{3})*(?:,\d+)?\s*(?:€|EUR)\s+statt\s+\d+(?:\.\d{3})*(?:,\d+)?\s*(?:€|EUR)\s*$/i,

      // 德语模式 3: nur <价格> statt <价格>
      // 匹配: "Product nur 12,50 € statt 25 €" 和带千位分隔符的价格
      /\s+nur\s+\d+(?:\.\d{3})*(?:,\d+)?\s*(?:€|EUR)\s+statt\s+\d+(?:\.\d{3})*(?:,\d+)?\s*(?:€|EUR)\s*$/i,

      // 德语模式 4: reduziert auf <价格> statt <价格>
      // 匹配: "Product reduziert auf 79,99 € statt 159,99 €" 和带千位分隔符的价格
      /\s+reduziert\s+auf\s+\d+(?:\.\d{3})*(?:,\d+)?\s*(?:€|EUR)\s+statt\s+\d+(?:\.\d{3})*(?:,\d+)?\s*(?:€|EUR)\s*$/i,
    ];

    let cleanedTitle = title;
    for (const pattern of tailPricePairPatterns) {
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
   * 解码 HTML 实体
   * 处理 &amp;, &lt;, &gt;, &quot; 等
   */
  private decodeHtmlEntities(text: string): string {
    const $ = cheerio.load(`<div>${text}</div>`);
    return $('div').text();
  }

  /**
   * 提取商家购买链接
   * 多策略提取: forward 链接 > 优惠按钮链接 > 直接商家链接
   */
  /**
   * 提取商家链接
   * 优先级：
   * 1. fullHtml 中的 forward.sparhamster.at 链接（原始加密跳转）
   * 2. content.rendered 中的 forward.sparhamster.at 链接
   * 3. CTA 按钮链接（包含特定关键词）
   * 4. 其他外链（排除 geizhals 等中间联盟链）
   */
  /**
   * 从 content.rendered 提取商家购买链接
   *
   * 策略:
   * 1. 查找 forward.sparhamster.at 链接
   * 2. 解码 HTML 实体 (&amp; → &)
   * 3. 如果链接缺少 token 参数，添加默认 token
   */
  private extractMerchantLink(contentHtml: string): string | null {
    if (!contentHtml) return null;

    // 默认 token（可配置）
    const DEFAULT_TOKEN = process.env.SPARHAMSTER_TOKEN || '0ccb1264cd81ad8e20f27dd146dfa37d';

    const $ = cheerio.load(contentHtml);
    const forwardLinks = $('a[href*="forward.sparhamster.at"]');

    if (forwardLinks.length > 0) {
      let href = $(forwardLinks[0]).attr('href');
      if (!href) return null;

      // 解码 HTML 实体 (&amp; → &)
      href = this.decodeHtmlEntities(href);

      // 如果链接缺少 token 参数，添加默认 token
      if (!href.includes('token=')) {
        const separator = href.includes('?') ? '&' : '?';
        href = `${href}${separator}token=${DEFAULT_TOKEN}`;
      }

      return href;
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
   * 从 hero 区块提取价格信息
   * 优先级：hero 区块 > .box-info > 全文提取
   */
  private extractPriceFromHero(html: string): {
    currentPrice?: number;
    originalPrice?: number;
    discountPercentage?: number;
  } {
    if (!html) return {};

    const $ = cheerio.load(html);

    // 提取现价：.uk-font-bold.has-blue-color 中的价格（不在 .box-info 内）
    // 支持德语千位分隔符: 1.108,24 €
    let currentPrice: number | undefined;
    $('.uk-font-bold.has-blue-color').each((_, el) => {
      // 排除在 .box-info 内的元素
      if ($(el).closest('.box-info').length === 0) {
        const text = $(el).text().trim();
        // 匹配德语价格格式：支持千位分隔符(.)和小数分隔符(,)
        // 例如: 1.108,24 € 或 3,49 € 或 25 €
        const match = text.match(/([\d\s.,]+)\s*€/);
        if (match && !currentPrice) {
          currentPrice = this.sanitizePriceText(match[1]);
        }
      }
    });

    // 提取原价：.line-through.has-gray-color
    let originalPrice: number | undefined;
    $('.line-through.has-gray-color, span.line-through').each((_, el) => {
      const text = $(el).text().trim();
      const match = text.match(/([\d\s.,]+)\s*€/);
      if (match && !originalPrice) {
        originalPrice = this.sanitizePriceText(match[1]);
      }
    });

    // 提取折扣百分比：.has-blue-color 中包含 "Ersparnis"
    let discountPercentage: number | undefined;
    $('.has-blue-color').each((_, el) => {
      const text = $(el).text().trim();
      const match = text.match(/(\d+)\s*%\s*Ersparnis/i);
      if (match && !discountPercentage) {
        discountPercentage = parseInt(match[1]);
      }
    });

    // 如果同时有现价和原价，计算折扣（如果还没有）
    if (currentPrice && originalPrice && !discountPercentage) {
      discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    }

    return {
      currentPrice,
      originalPrice,
      discountPercentage,
    };
  }

  /**
   * 提取 .box-info 中的价格更新信息
   * 格式: "Der Preis fällt auf <strong>88,84 €</strong> <del>93,64 €</del>!"
   * 注意：<strong> 是新价格，<del> 是旧价格
   */
  private extractPriceUpdate(html: string): {
    current?: number;
    previous?: number;
    note?: string;
  } | null {
    if (!html) return null;

    const $ = cheerio.load(html);
    const boxInfo = $('.box-info');

    if (boxInfo.length === 0) return null;

    const fullText = boxInfo.text().trim();
    const prices: number[] = [];

    // 先提取 strong 中的价格（新价格）
    // 支持德语千位分隔符: 1.108,24 €
    boxInfo.find('strong').each((_, el) => {
      const text = $(el).text().trim();
      const match = text.match(/([\d\s.,]+)\s*€/);
      if (match) {
        prices.push(this.sanitizePriceText(match[1]));
      }
    });

    // 然后提取 del 中的价格（旧价格）
    boxInfo.find('del').each((_, el) => {
      const text = $(el).text().trim();
      const match = text.match(/([\d\s.,]+)\s*€/);
      if (match) {
        prices.push(this.sanitizePriceText(match[1]));
      }
    });

    // 如果只有一个价格，当作现价
    if (prices.length === 1) {
      return {
        current: prices[0],
        note: fullText,
      };
    }

    // 如果有两个价格，第一个是新价，第二个是旧价
    if (prices.length >= 2) {
      return {
        current: prices[0],
        previous: prices[1],
        note: fullText,
      };
    }

    return {
      note: fullText,
    };
  }

  /**
   * 从文本中提取价格信息（德语 "um X statt Y" 模式）
   * 支持千位分隔符: 1.108,24 €
   *
   * 示例:
   * - "Product um 1.108,24 € statt 1.519,89 €" -> currentPrice: 1108.24, originalPrice: 1519.89
   * - "Product für 3,49 € statt 5,03 €" -> currentPrice: 3.49, originalPrice: 5.03
   */
  protected extractPriceInfo(text: string): {
    currentPrice?: number;
    originalPrice?: number;
    discountPercentage?: number;
  } {
    if (!text) return {};

    // 德语价格模式：um/für/nur/reduziert auf <现价> statt <原价>
    const germanPricePatterns = [
      /\b(?:um|für|nur)\s+([\d\s.,]+)\s*(?:€|EUR)\s+statt\s+([\d\s.,]+)\s*(?:€|EUR)/i,
      /\breduziert\s+auf\s+([\d\s.,]+)\s*(?:€|EUR)\s+statt\s+([\d\s.,]+)\s*(?:€|EUR)/i,
    ];

    for (const pattern of germanPricePatterns) {
      const match = text.match(pattern);
      if (match) {
        const currentPrice = this.sanitizePriceText(match[1]);
        const originalPrice = this.sanitizePriceText(match[2]);

        if (currentPrice > 0 && originalPrice > 0) {
          const discountPercentage = Math.round(
            ((originalPrice - currentPrice) / originalPrice) * 100
          );

          return {
            currentPrice,
            originalPrice,
            discountPercentage,
          };
        }
      }
    }

    // 简单价格提取：只提取单个价格
    // 使用宽泛的正则匹配任何数字+€格式
    const simpleMatch = text.match(/([\d\s.,]+)\s*(?:€|EUR)/);
    if (simpleMatch) {
      const price = this.sanitizePriceText(simpleMatch[1]);
      if (price > 0) {
        return {
          currentPrice: price,
        };
      }
    }

    return {};
  }

  /**
   * 提取商品图片（只取 wp-content/uploads 直链）
   * 排除商家 logo（/images/shops/）
   */
  private extractProductImage(html: string): string | null {
    if (!html) return null;

    const $ = cheerio.load(html);

    // 查找 src 包含 wp-content/uploads 的图片，但排除商家 logo
    const productImage = $('img').filter((_, el) => {
      const src = $(el).attr('src') || '';
      return src.includes('wp-content/uploads') && !src.includes('/images/shops/');
    });

    if (productImage.length > 0) {
      return $(productImage[0]).attr('src') || null;
    }

    return null;
  }

  /**
   * 从 WordPress API 的 _embedded['wp:term'] 提取商家信息（最准确）
   *
   * 策略:
   * 1. 遍历 _embedded['wp:term'] 中的所有 term 数组
   * 2. 查找 link 包含 "/shop/" 的 term（商家标签）
   * 3. 优先使用 name 字段，如果没有则使用 slug
   * 4. 从 slug 提取商家域名（将 mediamarkt-at → mediamarkt.at）
   * 5. 过滤黑名单：sparhamster, geizhals, idealo
   * 6. 使用 Google Favicon 服务生成 logo URL
   */
  private extractMerchantFromEmbedded(post: WordPressPost): {
    merchant?: string;
    logo?: string;
    domain?: string;
  } | null {
    // 黑名单：永远不能作为商家名
    const blacklist = ['sparhamster', 'geizhals', 'idealo'];

    const isBlacklisted = (name: string): boolean => {
      const lower = name.toLowerCase();
      return blacklist.some(blocked => lower.includes(blocked));
    };

    // 从 slug 提取域名（例如：mediamarkt-at → mediamarkt.at）
    const extractDomainFromSlug = (slug: string): string => {
      const lastDashIndex = slug.lastIndexOf('-');
      if (lastDashIndex !== -1) {
        return slug.substring(0, lastDashIndex) + '.' + slug.substring(lastDashIndex + 1);
      }
      return slug + '.com'; // 默认添加 .com
    };

    // 获取 _embedded['wp:term']
    const embedded = (post as any)._embedded;
    if (!embedded || !embedded['wp:term']) {
      return null;
    }

    const termGroups = embedded['wp:term'];
    if (!Array.isArray(termGroups)) {
      return null;
    }

    // 遍历所有 term 组（可能包含 categories 和 tags）
    for (const termGroup of termGroups) {
      if (!Array.isArray(termGroup)) continue;

      for (const term of termGroup) {
        const link = term.link || '';

        // 只处理 /shop/ 链接
        if (!link.includes('/shop/')) continue;

        // 优先使用 name，fallback 到 slug
        let merchantName = term.name || term.slug || '';
        if (!merchantName) continue;

        // 过滤黑名单
        if (isBlacklisted(merchantName)) continue;

        // 从 slug 提取域名（用于生成 favicon）
        const slug = term.slug || '';
        const domain = extractDomainFromSlug(slug);

        // 使用商家 logo 映射表（支持自定义覆盖，默认使用 Google Favicon）
        const logo = getMerchantLogo(merchantName, domain);

        // 找到了符合条件的商家
        return {
          merchant: merchantName,
          logo: logo,
          domain: domain,
        };
      }
    }

    return null;
  }

  /**
   * 从 content.rendered 提取商家信息
   * 解析 "Bei <strong>商家名</strong>" 模式
   *
   * 策略:
   * 1. 查找 "Bei <strong>...</strong>" 或 "bei <strong>...</strong>" 模式
   * 2. 提取 <strong> 标签中的商家名称
   * 3. 过滤黑名单
   */
  private extractMerchantFromContent(html: string): {
    merchant?: string;
    logo?: string;
    link?: string;
  } | null {
    if (!html) return null;

    const blacklist = ['sparhamster', 'geizhals', 'idealo'];
    const isBlacklisted = (name: string): boolean => {
      const lower = name.toLowerCase();
      return blacklist.some(blocked => lower.includes(blocked));
    };

    const $ = cheerio.load(html);

    // 查找 "Bei <strong>商家</strong>" 模式
    // 匹配 "Bei" 或 "bei" 开头的文本节点，后面紧跟 <strong>
    const beiPattern = /\b[Bb]ei\s+/;

    let result: { merchant?: string; logo?: string; link?: string } | null = null;

    $('p, div').each((_, elem) => {
      const text = $(elem).text();
      if (beiPattern.test(text)) {
        const strong = $(elem).find('strong').first();
        if (strong.length > 0) {
          const merchantName = strong.text().trim();
          if (merchantName && !isBlacklisted(merchantName)) {
            result = {
              merchant: merchantName,
              link: undefined,
              logo: undefined,
            };
            return false; // 停止遍历
          }
        }
      }
    });

    return result;
  }

  /**
   * 从 hero 区块提取商家信息
   * 通过 <a href="/shop/{slug}/"> 提取商家名称和 logo
   *
   * 策略:
   * 1. 遍历所有包含 /shop/ 的链接，只考虑带有商家 logo 的链接
   * 2. 跳过任何包含 "sparhamster" 的链接（这些是内部链接）
   * 3. 优先从 title 属性中提取：截取 "Gutscheine"/"Angebote"/"Sale"/"Shop"/"Deals" 等关键词前的内容
   * 4. 如果 title 为空或不含关键词，使用 slug 转换：将 slug 中最后一个 - 改成 .，保持其余 - 原样
   * 5. 返回第一个符合条件的商家信息
   */
  private extractMerchantFromHero(html: string): {
    merchant?: string;
    logo?: string;
  } | null {
    if (!html) return null;

    const $ = cheerio.load(html);

    // 黑名单：永远不能作为商家名
    const blacklist = ['sparhamster', 'geizhals', 'idealo'];

    // 关键词列表：用于从 title/alt 中截取商家名
    const keywords = ['Gutscheine', 'Angebote', 'Sale', 'Shop', 'Deals'];
    const keywordPattern = new RegExp(`\\s*(${keywords.join('|')})`, 'i');

    // 检查是否在黑名单中
    const isBlacklisted = (name: string): boolean => {
      const lower = name.toLowerCase();
      return blacklist.some(blocked => lower.includes(blocked));
    };

    // 从文本中截取关键词前的内容
    const extractBeforeKeywords = (text: string): string => {
      const match = text.match(keywordPattern);
      if (match && match.index !== undefined) {
        return text.substring(0, match.index).trim();
      }
      return '';
    };

    // 查找所有包含 /shop/ 的链接
    const shopLinks = $('a[href*="/shop/"]');

    // 遍历所有候选链接
    for (let i = 0; i < shopLinks.length; i++) {
      const shopLink = $(shopLinks[i]);
      const href = shopLink.attr('href') || '';
      const title = shopLink.attr('title') || '';

      // 检查是否包含商家 logo（支持懒加载：src, data-lazy-src, data-src）
      const logoImg = shopLink.find('img[src*="/wp-content/uploads/images/shops/"], img[data-lazy-src*="/wp-content/uploads/images/shops/"], img[data-src*="/wp-content/uploads/images/shops/"]');

      // 优先级：src > data-lazy-src > data-src
      const logo = logoImg.attr('src') || logoImg.attr('data-lazy-src') || logoImg.attr('data-src');

      if (!logo) {
        // 只考虑带有商家 logo 的链接
        continue;
      }

      let merchant: string | undefined;

      // ① 策略1：从 title 提取
      if (title) {
        const extracted = extractBeforeKeywords(title);
        if (extracted && !isBlacklisted(extracted)) {
          merchant = extracted;
        }
      }

      // ② 策略2：从 href slug 提取
      if (!merchant) {
        const slugMatch = href.match(/\/shop\/([^\/]+)\/?/);
        if (slugMatch) {
          const slug = slugMatch[1];
          // 将最后一个 - 改成 .（如 mediamarkt-at -> mediamarkt.at）
          const lastDashIndex = slug.lastIndexOf('-');
          const converted = lastDashIndex !== -1
            ? slug.substring(0, lastDashIndex) + '.' + slug.substring(lastDashIndex + 1)
            : slug;

          if (!isBlacklisted(converted)) {
            merchant = converted;
          }
        }
      }

      // ③ 策略3：从图片 alt 提取
      if (!merchant) {
        const imgAlt = logoImg.attr('alt') || '';
        if (imgAlt) {
          const extracted = extractBeforeKeywords(imgAlt);
          if (extracted && !isBlacklisted(extracted)) {
            merchant = extracted;
          }
        }
      }

      // 找到第一个有效商家，立即返回
      if (merchant) {
        return {
          merchant,
          logo,
        };
      }
    }

    // 没有找到有效商家
    return null;
  }

  /**
   * 检测联盟信息
   * 如果是 forward.sparhamster.at 链接且最终跳转到 Amazon，标记为联盟链接
   * 同时检查商家信息来判断联盟网络
   */
  private detectAffiliateInfo(merchantLink?: string, merchant?: string): {
    affiliateLink?: string;
    enabled: boolean;
    network?: string;
  } {
    if (!merchantLink) {
      return { enabled: false };
    }

    // 如果是 forward 链接，保留为联盟链接
    if (merchantLink.includes('forward.sparhamster.at')) {
      // 检查是否跳转到 Amazon
      // 1. URL 中包含 amazon
      // 2. 商家名称是 Amazon
      // 3. URL 中包含已知的 Amazon 联盟 tag (如 urbansoccer)
      const isAmazon =
        merchantLink.toLowerCase().includes('amazon') ||
        merchant?.toLowerCase().includes('amazon') ||
        merchantLink.includes('urbansoccer'); // 联盟 tag

      return {
        affiliateLink: merchantLink,
        enabled: true,
        network: isAmazon ? 'amazon' : undefined,
      };
    }

    // 检查直接的 Amazon 链接是否包含 tag 参数
    if (merchantLink.includes('amazon.') && merchantLink.includes('tag=')) {
      return {
        affiliateLink: merchantLink,
        enabled: true,
        network: 'amazon',
      };
    }

    return { enabled: false };
  }

  /**
   * 从 HTML 中提取分类标签（只保留 rel="category tag"）
   */
  private extractCategoriesFromHtml(html: string): string[] {
    if (!html) return [];

    const $ = cheerio.load(html);
    const categories: string[] = [];

    // 只提取 <a rel="category tag"> 的标签
    $('a[rel="category tag"]').each((_, el) => {
      const text = $(el).text().trim();
      if (text) {
        categories.push(text);
      }
    });

    // 去重
    return Array.from(new Set(categories));
  }

  /**
   * 提取发布时间（优先使用 <time datetime> 的 ISO 格式）
   */
  private extractPublishTime(html: string): Date | null {
    if (!html) return null;

    const $ = cheerio.load(html);
    const timeElement = $('time[datetime]').first();

    if (timeElement.length > 0) {
      const datetime = timeElement.attr('datetime');
      if (datetime) {
        return new Date(datetime);
      }
    }

    return null;
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
