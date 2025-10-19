/**
 * Sparhamster Fetcher
 * 从 Sparhamster API 抓取优惠信息
 * 集成 Normalizer 和 Deduplication 服务
 */

import axios from 'axios';
import { DatabaseManager } from '../database';
import { SparhamsterNormalizer } from '../normalizers/sparhamster-normalizer';
import { DeduplicationService } from '../services/deduplication-service';
import { HomepageFetcher, HomepageArticle } from '../services/homepage-fetcher';
import { FetchResult } from '../types/fetcher.types';
import { WordPressPost } from '../types/wordpress.types';
import { Deal } from '../types/deal.types';

// API 配置
const API_URL =
  process.env.SPARHAMSTER_API_URL ||
  'https://www.sparhamster.at/wp-json/wp/v2/posts';

const API_PER_PAGE = Number(process.env.SPARHAMSTER_API_LIMIT || '40');

/**
 * Sparhamster API Fetcher
 * 负责从 Sparhamster API 抓取数据并入库
 */
export class SparhamsterFetcher {
  private readonly normalizer: SparhamsterNormalizer;
  private readonly deduplicator: DeduplicationService;
  private readonly homepageFetcher: HomepageFetcher;

  constructor(private readonly database: DatabaseManager) {
    this.normalizer = new SparhamsterNormalizer();
    this.deduplicator = new DeduplicationService(database);
    this.homepageFetcher = new HomepageFetcher();
  }

  /**
   * 抓取最新优惠
   * 新架构:
   * 1. 从 REST API 获取结构化数据
   * 2. 从首页 HTML 获取真实的商家链接和 logo
   * 3. 匹配并补充数据
   */
  async fetchLatest(): Promise<FetchResult> {
    const result: FetchResult = {
      fetched: 0,
      inserted: 0,
      updated: 0,
      duplicates: 0,
      errors: [],
    };

    try {
      // Step 1: 从 REST API 获取结构化数据
      const url = `${API_URL}?per_page=${API_PER_PAGE}&_embed=true&orderby=date&order=desc`;

      const response = await axios.get<WordPressPost[]>(url, {
        headers: {
          'User-Agent':
            process.env.SPARHAMSTER_USER_AGENT ||
            'Mozilla/5.0 (compatible; MoreYuDeals/1.0)',
        },
        timeout: 15000,
      });

      const posts = response.data || [];
      result.fetched = posts.length;

      console.log(`📥 Sparhamster API 返回 ${posts.length} 条记录`);

      // Step 2: 从首页 HTML 抓取真实商家链接和 logo
      let homepageArticles: HomepageArticle[] = [];
      try {
        homepageArticles = await this.homepageFetcher.fetchArticles(posts.length);
        console.log(`🔗 从首页提取到 ${homepageArticles.length} 篇文章的商家链接`);
      } catch (error) {
        console.warn(`⚠️  抓取首页失败,将使用 fallbackLink: ${(error as Error).message}`);
      }

      // Step 3: 建立 postId -> HomepageArticle 映射
      const articleMap = new Map<string, HomepageArticle>();
      for (const article of homepageArticles) {
        if (article.postId) {
          articleMap.set(article.postId, article);
        }
        // 也支持通过 slug 匹配
        if (article.slug) {
          articleMap.set(article.slug, article);
        }
      }

      // Step 4: 处理每篇文章
      let enrichedCount = 0;
      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];

        try {
          const action = await this.processPost(post, articleMap);

          if (action.result === 'inserted') {
            result.inserted++;
          } else if (action.result === 'updated') {
            result.updated++;
          } else if (action.result === 'duplicate') {
            result.duplicates++;
          }

          if (action.enriched) {
            enrichedCount++;
          }
        } catch (error) {
          const message = `处理帖子 ${post.id} 失败: ${(error as Error).message}`;
          console.error(`❌ ${message}`);
          result.errors.push(message);
        }
      }

      // 统计信息
      const enrichmentRate = posts.length > 0
        ? ((enrichedCount / posts.length) * 100).toFixed(1)
        : '0.0';

      console.log(`\n📊 商家信息补充统计:`);
      console.log(`   - 成功补充: ${enrichedCount}/${posts.length} (${enrichmentRate}%)`);
      console.log(`   - 使用 fallback: ${posts.length - enrichedCount}/${posts.length}`);

    } catch (error) {
      const message = `抓取 Sparhamster API 失败: ${(error as Error).message}`;
      console.error(`❌ ${message}`);
      result.errors.push(message);
    }

    return result;
  }

  /**
   * 处理单个帖子
   * @param post REST API 返回的文章数据
   * @param articleMap 首页 HTML 提取的文章信息映射
   * @returns 处理结果和是否成功补充商家信息
   */
  private async processPost(
    post: WordPressPost,
    articleMap: Map<string, HomepageArticle>
  ): Promise<{ result: 'inserted' | 'updated' | 'duplicate'; enriched: boolean }> {
    // 1. 标准化数据（从 REST API 提取结构化字段）
    const deal = await this.normalizer.normalize(post);

    // 2. 从首页数据补充 merchantLink 和 merchantLogo
    const postId = post.id.toString();
    const slug = this.extractSlug(post.link);

    let enriched = false;
    const homepageArticle = articleMap.get(postId) || (slug ? articleMap.get(slug) : undefined);

    if (homepageArticle) {
      // 成功匹配到首页数据,补充真实链接
      if (homepageArticle.merchantLink) {
        deal.merchantLink = homepageArticle.merchantLink;
        enriched = true;
      }

      // 如果首页也有 logo,优先使用首页的（更可靠）
      if (homepageArticle.merchantLogo) {
        deal.merchantLogo = homepageArticle.merchantLogo;
      }

      // 更新联盟信息（因为 merchantLink 已更新）
      const affiliateInfo = this.detectAffiliateInfo(deal.merchantLink, deal.merchant);
      deal.affiliateLink = affiliateInfo.affiliateLink;
      deal.affiliateEnabled = affiliateInfo.enabled;
      deal.affiliateNetwork = affiliateInfo.network;
    }

    // 3. 检查重复
    const dupResult = await this.deduplicator.checkDuplicate(deal);

    if (dupResult.isDuplicate && dupResult.existingDeal) {
      // 4a. 处理重复(传入新deal数据以更新商家信息)
      await this.deduplicator.handleDuplicate(dupResult.existingDeal.id, deal);
      console.log(
        `🔁 检测到重复: ${deal.title} (类型: ${dupResult.duplicateType}${enriched ? ', 已补充链接' : ''})`
      );
      return { result: 'duplicate', enriched };
    }

    // 4b. 插入新记录
    await this.database.createDeal(deal);
    const linkStatus = enriched ? '✓ 真实链接' : '⚠ fallback';
    console.log(
      `✅ 新增 Deal: ${deal.title} (${deal.sourceSite}:${deal.sourcePostId}) [${linkStatus}]`
    );
    return { result: 'inserted', enriched };
  }

  /**
   * 从 URL 提取 slug
   */
  private extractSlug(url: string): string | undefined {
    const match = url.match(/\/([^\/]+)\/?$/);
    return match ? match[1] : undefined;
  }

  /**
   * 检测联盟信息
   */
  private detectAffiliateInfo(merchantLink?: string, merchant?: string): {
    affiliateLink?: string;
    enabled: boolean;
    network?: string;
  } {
    if (!merchantLink) {
      return { enabled: false };
    }

    if (merchantLink.includes('forward.sparhamster.at')) {
      const isAmazon =
        merchantLink.toLowerCase().includes('amazon') ||
        merchant?.toLowerCase().includes('amazon');

      return {
        affiliateLink: merchantLink,
        enabled: true,
        network: isAmazon ? 'amazon' : undefined,
      };
    }

    return { enabled: false };
  }
}
