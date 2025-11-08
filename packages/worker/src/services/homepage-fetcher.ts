/**
 * Homepage Fetcher Service
 * 抓取 Sparhamster 首页 HTML,提取真实的商家链接和 logo
 *
 * 功能:
 * 1. 根据文章数量动态决定抓取页数 (1-3 页)
 * 2. 提取每个文章卡片中的 forward 链接和商家 logo
 * 3. 支持请求延迟和重试机制
 */

import axios from 'axios';
import * as cheerio from '@moreyudeals/shared-html';

/**
 * 从首页提取的文章信息
 */
export interface HomepageArticle {
  postId: string;           // 文章 ID
  slug?: string;            // 文章 slug
  merchantLink?: string;    // 真实的 forward 跳转链接
  merchantLogo?: string;    // 商家 logo URL
}

/**
 * Homepage Fetcher 服务
 */
export class HomepageFetcher {
  private readonly baseUrl: string;
  private readonly userAgent: string;
  private readonly minDelay: number;
  private readonly maxDelay: number;
  private readonly maxRetries: number;

  constructor() {
    this.baseUrl = process.env.SPARHAMSTER_BASE_URL || 'https://www.sparhamster.at';
    this.userAgent = process.env.SPARHAMSTER_USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    this.minDelay = 300;
    this.maxDelay = 600;
    this.maxRetries = 2;
  }

  /**
   * 根据文章数量决定需要抓取的页数
   */
  private calculatePagesToFetch(articleCount: number): number {
    if (articleCount <= 12) return 1;
    if (articleCount <= 24) return 2;
    return 3; // 最多抓 3 页
  }

  /**
   * 随机延迟 (300-600ms)
   */
  private async randomDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * (this.maxDelay - this.minDelay + 1)) + this.minDelay;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 抓取单个页面 HTML (带重试)
   */
  private async fetchPage(pageNumber: number): Promise<string | null> {
    const url = pageNumber === 1
      ? this.baseUrl
      : `${this.baseUrl}/page/${pageNumber}/`;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🌐 抓取首页 HTML (页面 ${pageNumber}, 尝试 ${attempt + 1}/${this.maxRetries + 1}): ${url}`);

        const response = await axios.get(url, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept-Language': 'de,en;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          timeout: 15000,
        });

        return response.data;
      } catch (error) {
        const message = (error as Error).message;
        console.warn(`⚠️  抓取页面 ${pageNumber} 失败 (尝试 ${attempt + 1}): ${message}`);

        if (attempt < this.maxRetries) {
          await this.randomDelay();
        }
      }
    }

    console.error(`❌ 抓取页面 ${pageNumber} 失败,已达最大重试次数`);
    return null;
  }

  /**
   * 从 HTML 解析文章列表
   * 提取文章 ID/slug、forward 链接和商家 logo
   */
  private parseArticles(html: string): HomepageArticle[] {
    const $ = cheerio.load(html);
    const articles: HomepageArticle[] = [];

    // 查找所有文章卡片
    // Sparhamster 首页的文章通常在 <article> 标签中
    $('article').each((_, elem) => {
      const article = $(elem);

      // 提取文章 ID (通常在 id="post-{id}" 或 data-post-id 属性中)
      const articleId = article.attr('id')?.match(/post-(\d+)/)?.[1] ||
                        article.attr('data-post-id');

      // 提取文章链接 (用于提取 slug)
      const articleLink = article.find('a.more-link, a[rel="bookmark"]').first().attr('href');
      const slug = articleLink?.match(/\/([^\/]+)\/?$/)?.[1];

      // 提取 "Zum Angebot" 按钮的 forward 链接
      const offerButton = article.find('a[href*="forward.sparhamster.at"]').first();
      let merchantLink = offerButton.attr('href');

      // 解码 HTML 实体 (&amp; -> &)
      if (merchantLink) {
        merchantLink = this.decodeHtmlEntities(merchantLink);
      }

      // 提取商家 logo
      let merchantLogo: string | undefined;

      // 优先查找文章中包含 /images/shops/ 的图片 (这才是真正的商家logo)
      const shopLogo = article.find('img[src*="/images/shops/"], img[data-lazy-src*="/images/shops/"], img[data-src*="/images/shops/"]').first();
      if (shopLogo.length > 0) {
        merchantLogo = shopLogo.attr('data-lazy-src') ||  // 优先 data-lazy-src
                      shopLogo.attr('data-src') ||
                      shopLogo.attr('src');
      }

      // 只记录有 ID 或 slug 的文章
      if (articleId || slug) {
        articles.push({
          postId: articleId || '',
          slug,
          merchantLink,
          merchantLogo,
        });
      }
    });

    return articles;
  }

  /**
   * 解码 HTML 实体
   * 使用 .text() 而不是 .html() 来真正解码实体 (如 &amp; -> &)
   */
  private decodeHtmlEntities(text: string): string {
    const $ = cheerio.load(`<div>${text}</div>`);
    return $('div').text() || text;
  }

  /**
   * 抓取首页文章信息
   * @param expectedArticleCount 预期的文章数量 (用于决定抓取页数)
   * @returns 文章信息数组
   */
  async fetchArticles(expectedArticleCount: number): Promise<HomepageArticle[]> {
    const pagesToFetch = this.calculatePagesToFetch(expectedArticleCount);
    console.log(`📄 根据 ${expectedArticleCount} 篇文章,决定抓取 ${pagesToFetch} 页首页 HTML`);

    const allArticles: HomepageArticle[] = [];

    for (let page = 1; page <= pagesToFetch; page++) {
      // 第一页之后加延迟
      if (page > 1) {
        await this.randomDelay();
      }

      const html = await this.fetchPage(page);
      if (!html) {
        console.warn(`⚠️  跳过页面 ${page},继续处理已抓取的内容`);
        continue;
      }

      const articles = this.parseArticles(html);
      console.log(`✅ 页面 ${page} 解析到 ${articles.length} 篇文章`);

      allArticles.push(...articles);
    }

    console.log(`🎯 共提取 ${allArticles.length} 篇文章信息`);
    return allArticles;
  }
}
