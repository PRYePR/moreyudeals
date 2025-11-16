/**
 * Homepage Fetcher Service (v2.0 - 完全重写)
 *
 * 功能：
 * 1. 从 Sparhamster 首页抓取 HTML
 * 2. 提取完整的文章信息（商家、价格、标题等）
 * 3. 动态决定抓取页数（1-3页）
 * 4. 模拟人类行为（随机延迟、完整 Headers）
 *
 * 数据优先级策略：
 * - HTML 是主要数据源（价格、商家、标题等）
 * - API 只提供文章内容（content_html）
 */

import axios from 'axios';
import * as cheerio from '@moreyudeals/shared-html';
import { MERCHANT_MAPPINGS } from '../config/merchant-mapping';

/**
 * 从首页提取的完整文章信息
 */
export interface HomepageArticle {
  // 基础信息
  postId: string;              // 文章 ID（必需）
  slug?: string;               // 文章 slug
  link?: string;               // 文章详情页链接

  // 标题
  title?: string;              // 文章标题（HTML为准）

  // 商家信息
  merchant?: string;           // 商家名称
  merchantLogo?: string;       // 商家 Logo URL
  merchantLink?: string;       // Forward 跳转链接（解码后）

  // 价格信息
  price?: number;              // 现价
  originalPrice?: number;      // 原价（划线价格）
  discount?: number;           // 折扣百分比

  // 优惠信息
  couponCode?: string;         // 优惠码
  expiresIn?: string;          // 活动剩余时间（如 "noch 23 Stunden"）

  // 图片
  imageUrl?: string;           // 商品图片 URL

  // 分类和时间
  categories?: string[];       // 分类标签
  publishedAt?: Date;          // 发布时间
  modifiedAt?: Date;           // 最后更新时间
}

/**
 * Homepage Fetcher 配置
 */
interface FetcherConfig {
  baseUrl: string;
  userAgent: string;
  minDelay: number;      // 最小延迟（毫秒）
  maxDelay: number;      // 最大延迟（毫秒）
  maxRetries: number;    // 最大重试次数
  timeout: number;       // 请求超时（毫秒）
}

/**
 * Homepage Fetcher 服务
 */
export class HomepageFetcher {
  private readonly config: FetcherConfig;

  constructor() {
    this.config = {
      baseUrl: process.env.SPARHAMSTER_BASE_URL || 'https://www.sparhamster.at',
      userAgent: process.env.SPARHAMSTER_USER_AGENT ||
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      minDelay: 5000,     // 5秒（模拟人类）
      maxDelay: 15000,    // 15秒
      maxRetries: 2,
      timeout: 30000,     // 30秒
    };
  }

  /**
   * 抓取首页文章信息
   *
   * @param expectedArticleCount API 返回的文章数量（用于决定抓取页数）
   * @param existingPostIds 已存在的 post ID（用于判断是否继续抓取下一页）
   * @returns 文章信息数组
   */
  async fetchArticles(
    expectedArticleCount: number,
    existingPostIds: Set<string> = new Set()
  ): Promise<HomepageArticle[]> {
    console.log(`📄 开始抓取首页 HTML (预期 ${expectedArticleCount} 篇文章)`);

    const allArticles: HomepageArticle[] = [];
    const maxPages = 3; // 最多抓取 3 页

    for (let page = 1; page <= maxPages; page++) {
      // 第一页之后加随机延迟（模拟人类）
      if (page > 1) {
        const delay = this.getRandomDelay();
        console.log(`⏳ 延迟 ${(delay / 1000).toFixed(1)} 秒后抓取第 ${page} 页...`);
        await this.sleep(delay);
      }

      // 抓取页面
      const html = await this.fetchPage(page);
      if (!html) {
        console.warn(`⚠️ 第 ${page} 页抓取失败，停止`);
        break;
      }

      // 解析文章
      const articles = this.parseArticles(html);
      console.log(`✅ 第 ${page} 页解析到 ${articles.length} 篇文章`);

      allArticles.push(...articles);

      // 判断是否继续抓取下一页
      if (page < maxPages) {
        const newCount = articles.filter(a => !existingPostIds.has(a.postId)).length;
        console.log(`📊 第 ${page} 页新文章数量: ${newCount}`);

        // 如果没有新文章，停止抓取
        if (newCount === 0) {
          console.log(`✓ 没有新文章，停止抓取后续页面`);
          break;
        }

        console.log(`✓ 发现 ${newCount} 篇新文章，继续抓取下一页...`);
      }
    }

    console.log(`🎯 共提取 ${allArticles.length} 篇文章`);
    return allArticles;
  }

  /**
   * 抓取单个页面（带重试）
   */
  private async fetchPage(pageNumber: number): Promise<string | null> {
    const url = pageNumber === 1
      ? this.config.baseUrl
      : `${this.config.baseUrl}/page/${pageNumber}/`;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`🌐 抓取第 ${pageNumber} 页 (尝试 ${attempt + 1}/${this.config.maxRetries + 1}): ${url}`);

        const response = await axios.get(url, {
          headers: {
            'User-Agent': this.config.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'de-AT,de;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': this.config.baseUrl,
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
          },
          timeout: this.config.timeout,
        });

        return response.data;
      } catch (error) {
        const message = (error as Error).message;
        console.warn(`⚠️ 第 ${pageNumber} 页抓取失败 (尝试 ${attempt + 1}): ${message}`);

        // 如果还有重试机会，等待后重试
        if (attempt < this.config.maxRetries) {
          await this.sleep(this.getRandomDelay());
        }
      }
    }

    console.error(`❌ 第 ${pageNumber} 页抓取失败，已达最大重试次数`);
    return null;
  }

  /**
   * 解析首页 HTML，提取所有文章信息
   */
  private parseArticles(html: string): HomepageArticle[] {
    const $ = cheerio.load(html);
    const articles: HomepageArticle[] = [];

    // 查找所有文章卡片
    $('article.post').each((_, elem) => {
      const article = $(elem);

      try {
        // 1. 提取 Post ID（必需字段）
        const postId = this.extractPostId(article);
        if (!postId) {
          return; // 跳过没有 ID 的文章
        }

        // 2. 提取标题和链接
        const { title, link, slug } = this.extractTitleAndLink(article);

        // 3. 提取商家信息
        const { merchant } = this.extractMerchantInfo(article);

        // 4. 提取 Forward 链接
        const merchantLink = this.extractForwardLink(article);

        // 5. 生成商家 Logo（基于商家名称 + merchant-mapping）
        const merchantLogo = this.generateMerchantLogoFromName(merchant);

        // 6. 提取价格信息
        const { price, originalPrice, discount } = this.extractPriceInfo(article);

        // 7. 提取优惠码
        const couponCode = this.extractCouponCode(article);

        // 8. 提取活动剩余时间
        const expiresIn = this.extractExpiresIn(article);

        // 9. 提取商品图片
        const imageUrl = this.extractImageUrl(article);

        // 10. 提取分类标签
        const categories = this.extractCategories(article);

        // 11. 提取时间信息
        const { publishedAt, modifiedAt } = this.extractDates(article);

        // 组装文章信息
        articles.push({
          postId,
          slug,
          link,
          title,
          merchant,
          merchantLogo,
          merchantLink,
          price,
          originalPrice,
          discount,
          couponCode,
          expiresIn,
          imageUrl,
          categories,
          publishedAt,
          modifiedAt,
        });
      } catch (error) {
        console.error(`解析文章失败: ${(error as Error).message}`);
      }
    });

    return articles;
  }

  /**
   * 提取 Post ID
   */
  private extractPostId(article: cheerio.Cheerio): string | null {
    const id = article.attr('id');
    if (!id) return null;

    const match = id.match(/post-(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * 提取标题和链接
   */
  private extractTitleAndLink(article: cheerio.Cheerio): {
    title?: string;
    link?: string;
    slug?: string;
  } {
    // 从 <h2><a> 提取标题和链接
    const titleLink = article.find('h2 a').first();
    const title = titleLink.text().trim() || undefined;
    const link = titleLink.attr('href') || undefined;

    // 从链接提取 slug
    let slug: string | undefined;
    if (link) {
      const match = link.match(/\/([^\/]+)\/?$/);
      slug = match ? match[1] : undefined;
    }

    return { title, link, slug };
  }

  /**
   * 提取商家信息（仅名称，Logo 由 generateMerchantLogo 生成）
   */
  private extractMerchantInfo(article: cheerio.Cheerio): {
    merchant?: string;
  } {
    const shopLink = article.find('a[href*="/shop/"]').first();
    if (!shopLink.length) {
      return {};
    }

    // 提取商家名称（从 title 属性，去掉后缀）
    const titleAttr = shopLink.attr('title') || '';
    let merchant: string | undefined = titleAttr
      .replace(/\s*(&amp;|&)\s*/g, ' & ')  // 处理 &amp;
      .replace(/\s*(Gutscheine|Angebote|Sale|Shop|Deals).*$/i, '')  // 去掉后缀
      .trim();

    // 如果提取失败或为空，不设置商家
    if (!merchant) {
      merchant = undefined;
    }

    return { merchant };
  }

  /**
   * 基于商家名称生成 Logo（使用 merchant-mapping 配置）
   */
  private generateMerchantLogoFromName(merchantName?: string): string | undefined {
    if (!merchantName) {
      return undefined;
    }

    // 查找商家配置（不区分大小写）
    const normalizedName = merchantName.toLowerCase().trim();
    const mapping = MERCHANT_MAPPINGS.find(m =>
      m.aliases.some(alias => alias.toLowerCase() === normalizedName)
    );

    if (mapping && mapping.website) {
      // 从配置的 website 提取域名
      try {
        const url = new URL(mapping.website);
        const domain = url.hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      } catch (error) {
        console.warn(`无法解析商家网站: ${mapping.website}`, error);
      }
    }

    // 如果没有找到配置，返回 undefined（不生成 logo）
    return undefined;
  }

  /**
   * 提取 Forward 链接（解码 HTML 实体）
   */
  private extractForwardLink(article: cheerio.Cheerio): string | undefined {
    const forwardLink = article
      .find('a[href*="forward.sparhamster.at"]')
      .first()
      .attr('href');

    if (!forwardLink) return undefined;

    // 解码 HTML 实体（&amp; → &）
    return this.decodeHtmlEntities(forwardLink);
  }

  /**
   * 提取价格信息
   */
  private extractPriceInfo(article: cheerio.Cheerio): {
    price?: number;
    originalPrice?: number;
    discount?: number;
  } {
    // 现价（.post-price.has-blue-color）
    const priceDiv = article.find('.post-price.has-blue-color').first();
    const priceText = priceDiv.text().trim();
    const price = this.parsePrice(priceText);

    // 原价（划线价格）
    const originalPriceSpan = article.find('span[style*="line-through"]').first();
    const originalPriceText = originalPriceSpan.text().trim();
    const originalPrice = this.parsePrice(originalPriceText);

    // 折扣百分比
    let discount: number | undefined;
    const discountSpan = article.find('.has-blue-color').filter((_, el) => {
      return cheerio.load(el)('*').text().includes('Ersparnis');
    }).first();

    if (discountSpan.length) {
      const match = discountSpan.text().match(/(\d+)\s*%/);
      discount = match ? parseInt(match[1]) : undefined;
    }

    // 如果有现价和原价但没有折扣，计算折扣
    if (!discount && price && originalPrice && originalPrice > price) {
      discount = Math.round(((originalPrice - price) / originalPrice) * 100);
    }

    return { price, originalPrice, discount };
  }

  /**
   * 解析德语价格格式
   *
   * 德语格式：
   * - 千位分隔符：. (点)
   * - 小数分隔符：, (逗号)
   *
   * 示例：
   * - "13,14 €" → 13.14
   * - "1.108,24 €" → 1108.24
   * - "18,37 €" → 18.37
   */
  private parsePrice(priceText: string): number | undefined {
    if (!priceText) return undefined;

    // 提取数字部分
    const match = priceText.match(/([\d.,\s]+)\s*€/);
    if (!match) return undefined;

    // 删除空格
    let cleaned = match[1].replace(/\s+/g, '');

    // 找到最后一个分隔符
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');

    if (lastComma === -1 && lastDot === -1) {
      // 没有分隔符，直接转换
      return parseFloat(cleaned) || undefined;
    }

    // 判断哪个是小数分隔符
    if (lastComma > lastDot) {
      // 最后是逗号 → 逗号是小数点（德语格式）
      // 例如：1.108,24 → 删除点，逗号换成点
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // 最后是点 → 点是小数点
      // 删除逗号
      cleaned = cleaned.replace(/,/g, '');
    }

    const result = parseFloat(cleaned);
    return isNaN(result) ? undefined : result;
  }

  /**
   * 提取优惠码
   *
   * 注意：需要过滤掉 "Spar-Abo aktivieren" 等非优惠码文本
   */
  private extractCouponCode(article: cheerio.Cheerio): string | undefined {
    const couponDiv = article.find('.couponCode').first();
    if (!couponDiv.length) return undefined;

    const text = couponDiv.text().trim();

    // 过滤黑名单
    const blacklist = [
      'Spar-Abo aktivieren',
      'Gutschein einlösen',
      'Zum Angebot',
      'Mehr erfahren',
    ];

    if (blacklist.some(b => text.includes(b))) {
      return undefined;
    }

    // 真正的优惠码通常是大写字母+数字组合
    const match = text.match(/[A-Z0-9]{4,}/);
    return match ? match[0] : undefined;
  }

  /**
   * 提取活动剩余时间
   */
  private extractExpiresIn(article: cheerio.Cheerio): string | undefined {
    const timeDiv = article.find('.uk-text-muted:contains("noch")').first();
    if (!timeDiv.length) return undefined;

    // 提取 "noch X Stunden" 或 "noch X Tage"
    const text = timeDiv.text().trim();
    const match = text.match(/noch\s+(\d+\s+(?:Stunden?|Tage?|Minuten?))/i);
    return match ? match[0] : undefined;
  }

  /**
   * 提取商品图片
   */
  private extractImageUrl(article: cheerio.Cheerio): string | undefined {
    // 查找 wp-content/uploads 的图片，排除商家 logo
    const productImg = article
      .find('img[src*="wp-content/uploads"], img[data-lazy-src*="wp-content/uploads"]')
      .filter((_, el) => {
        const $el = cheerio.load(el)('img');
        const src = $el.attr('src') || '';
        const lazySrc = $el.attr('data-lazy-src') || '';
        // 排除商家 logo（路径包含 /images/shops/）
        return !src.includes('/images/shops/') && !lazySrc.includes('/images/shops/');
      })
      .first();

    if (!productImg.length) return undefined;

    return (
      productImg.attr('data-lazy-src') ||
      productImg.attr('src') ||
      undefined
    );
  }

  /**
   * 提取分类标签
   */
  private extractCategories(article: cheerio.Cheerio): string[] {
    const classes = article.attr('class') || '';
    const categories: string[] = [];

    // 从 class 中提取 category-xxx
    const matches = classes.matchAll(/category-([^\s]+)/g);
    for (const match of matches) {
      const category = match[1];
      // 过滤通用标签
      if (category !== 'schnaeppchen' && category !== 'post') {
        categories.push(category);
      }
    }

    return categories;
  }

  /**
   * 提取时间信息
   */
  private extractDates(article: cheerio.Cheerio): {
    publishedAt?: Date;
    modifiedAt?: Date;
  } {
    // 发布时间
    const publishedMeta = article.find('meta[property="datePublished"]');
    const publishedStr = publishedMeta.attr('content');
    const publishedAt = publishedStr ? new Date(publishedStr) : undefined;

    // 最后更新时间
    const modifiedMeta = article.find('meta[property="dateModified"]');
    const modifiedStr = modifiedMeta.attr('content');
    const modifiedAt = modifiedStr ? new Date(modifiedStr) : undefined;

    return { publishedAt, modifiedAt };
  }

  /**
   * 解码 HTML 实体
   */
  private decodeHtmlEntities(text: string): string {
    const $ = cheerio.load(`<div>${text}</div>`);
    return $('div').text() || text;
  }

  /**
   * 获取随机延迟（毫秒）
   */
  private getRandomDelay(): number {
    const { minDelay, maxDelay } = this.config;
    return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
  }

  /**
   * 休眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
