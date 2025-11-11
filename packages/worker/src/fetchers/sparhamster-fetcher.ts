/**
 * Sparhamster Fetcher (v2.0 - 完全重写)
 *
 * 新架构：
 * 1. API优先：快速检测更新，获取文章内容
 * 2. HTML补充：提取准确的价格、商家、标题等
 * 3. 智能降级：API失败自动切换纯HTML模式
 * 4. 数据合并：HTML覆盖API（HTML更准确）
 *
 * 数据优先级：
 * - API提供：content_html, publishedAt, modifiedAt
 * - HTML覆盖：title, price, merchant, logo, 等其他所有字段
 */

import axios from 'axios';
import { DatabaseManager } from '../database';
import { SparhamsterNormalizer } from '../normalizers/sparhamster-normalizer';
import { DeduplicationService } from '../services/deduplication-service';
import { HomepageFetcher, HomepageArticle } from '../services/homepage-fetcher';
import { AffiliateLinkService } from '../services/affiliate-link-service';
import { ApiHealthMonitor } from '../services/api-health-monitor';
import { FetchResult } from '../types/fetcher.types';
import { WordPressPost } from '../types/wordpress.types';
import { Deal } from '../types/deal.types';

// API 配置
const API_URL = process.env.SPARHAMSTER_API_URL || 'https://www.sparhamster.at/wp-json/wp/v2/posts';
const API_PER_PAGE = Number(process.env.SPARHAMSTER_API_LIMIT || '20');

/**
 * API 返回的基础数据
 */
interface ApiData {
  postId: string;
  contentHtml: string;
  publishedAt: Date;
  modifiedAt: Date;
  link: string;
}

/**
 * Sparhamster Fetcher
 */
export class SparhamsterFetcher {
  private readonly normalizer: SparhamsterNormalizer;
  private readonly deduplicator: DeduplicationService;
  private readonly homepageFetcher: HomepageFetcher;
  private readonly affiliateLinkService: AffiliateLinkService;
  private readonly healthMonitor: ApiHealthMonitor;

  constructor(private readonly database: DatabaseManager) {
    this.normalizer = new SparhamsterNormalizer();
    this.deduplicator = new DeduplicationService(database);
    this.homepageFetcher = new HomepageFetcher();
    this.affiliateLinkService = new AffiliateLinkService();
    this.healthMonitor = new ApiHealthMonitor();
  }

  /**
   * 主抓取方法
   *
   * 流程：
   * 1. 检查 API 健康状态
   * 2. 如果健康：使用 API+HTML 混合模式
   * 3. 如果降级：使用纯 HTML 模式
   */
  async fetchLatest(): Promise<FetchResult> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 开始新一轮抓取');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const result: FetchResult = {
      fetched: 0,
      inserted: 0,
      updated: 0,
      duplicates: 0,
      errors: [],
    };

    // 1. 检查 API 健康状态
    const health = this.healthMonitor.checkHealth();

    if (health === 'degraded') {
      console.log('⚠️  处于降级模式，使用纯 HTML 抓取');
      return await this.fetchFromHtmlOnly(result);
    }

    // 2. 尝试 API+HTML 混合模式
    try {
      return await this.fetchFromApiWithHtml(result);
    } catch (error) {
      const errorMsg = (error as Error).message;
      console.error(`❌ API 抓取失败: ${errorMsg}`);
      this.healthMonitor.recordFailure(errorMsg);
      result.errors.push(errorMsg);

      // 检查是否需要切换降级模式
      const newHealth = this.healthMonitor.checkHealth();
      if (newHealth === 'degraded') {
        console.log('⚠️  已切换到降级模式，使用纯 HTML 抓取');
        return await this.fetchFromHtmlOnly(result);
      }

      return result;
    }
  }

  /**
   * API + HTML 混合模式（正常模式）
   *
   * 流程：
   * 1. 抓取 API 获取文章内容
   * 2. 判断新文章数量
   * 3. 抓取 HTML 获取准确数据
   * 4. 合并数据（HTML 覆盖 API）
   * 5. 处理联盟链接
   * 6. 去重和入库
   */
  private async fetchFromApiWithHtml(result: FetchResult): Promise<FetchResult> {
    console.log('📡 模式: API + HTML 混合');

    // Step 1: 抓取 API
    const apiData = await this.fetchApi();
    result.fetched = apiData.length;

    if (apiData.length === 0) {
      console.log('✓ API 返回 0 条记录，跳过');
      return result;
    }

    console.log(`📥 API 返回 ${apiData.length} 条记录`);

    // Step 2: 检查新文章数量
    const existingPostIds = await this.getExistingPostIds();
    const newApiData = apiData.filter(a => !existingPostIds.has(a.postId));

    if (newApiData.length === 0) {
      console.log('✓ 无新文章，跳过 HTML 抓取');
      this.healthMonitor.recordSuccess();
      return result;
    }

    console.log(`📊 新文章数量: ${newApiData.length}/${apiData.length}`);

    // Step 3: 延迟后抓取 HTML
    const delay = this.getRandomDelay(3000, 10000);
    console.log(`⏳ 延迟 ${(delay / 1000).toFixed(1)} 秒后抓取 HTML...`);
    await this.sleep(delay);

    const htmlArticles = await this.homepageFetcher.fetchArticles(
      apiData.length,
      existingPostIds
    );

    console.log(`🔗 从 HTML 提取 ${htmlArticles.length} 篇文章`);

    // Step 4: 合并数据（建立映射）
    const htmlMap = new Map<string, HomepageArticle>();
    for (const article of htmlArticles) {
      htmlMap.set(article.postId, article);
    }

    // 建立 API Map
    const apiMap = new Map<string, ApiData>();
    for (const apiItem of apiData) {
      apiMap.set(apiItem.postId, apiItem);
    }

    // Step 5: 处理所有文章（HTML 为主，API 为辅）
    for (const htmlData of htmlArticles) {
      try {
        const apiItem = apiMap.get(htmlData.postId);
        let deal: Deal;

        if (apiItem) {
          // 混合模式：API + HTML
          deal = await this.normalizer.normalizeWithHtml(apiItem, htmlData);
        } else {
          // 纯 HTML 模式：只有 HTML 数据
          console.log(`📝 Post ${htmlData.postId} 无 API 数据，使用纯 HTML 模式`);
          deal = await this.normalizer.normalizeFromHtmlOnly(htmlData);
        }

        // 处理联盟链接（保留原有逻辑）
        if (deal.merchantLink) {
          const affiliateResult = await this.affiliateLinkService.processAffiliateLink(
            deal.merchant,
            deal.canonicalMerchantName,
            deal.merchantLink
          );

          if (affiliateResult.enabled && affiliateResult.affiliateLink) {
            deal.affiliateLink = affiliateResult.affiliateLink;
            deal.affiliateEnabled = true;
            deal.affiliateNetwork = affiliateResult.network;
            console.log(`✅ 联盟链接 (${affiliateResult.network}): ${deal.merchant}`);
          }
        }

        // 去重检查
        const dupResult = await this.deduplicator.checkDuplicate(deal);

        if (dupResult.isDuplicate && dupResult.existingDeal) {
          // 更新现有记录
          await this.deduplicator.handleDuplicate(dupResult.existingDeal.id, deal);
          result.duplicates++;
          console.log(`🔁 重复: ${deal.titleDe || deal.originalTitle} (${dupResult.duplicateType})`);
        } else {
          // 插入新记录
          await this.database.createDeal(deal);
          result.inserted++;
          console.log(`✅ 新增: ${deal.titleDe || deal.originalTitle}`);
        }
      } catch (error) {
        const errorMsg = `处理 Post ${htmlData.postId} 失败: ${(error as Error).message}`;
        console.error(`❌ ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    // 记录 API 成功
    this.healthMonitor.recordSuccess();

    console.log('\n📊 抓取统计:');
    console.log(`   - 抓取: ${result.fetched}`);
    console.log(`   - 新增: ${result.inserted}`);
    console.log(`   - 重复: ${result.duplicates}`);
    console.log(`   - 错误: ${result.errors.length}`);

    return result;
  }

  /**
   * 纯 HTML 模式（降级模式）
   *
   * 流程：
   * 1. 逐页抓取 HTML（最多3页）
   * 2. 新文章 > 5 继续，≤ 5 停止
   * 3. 缺少 content_html 标记为 'missing'
   * 4. 其他处理同混合模式
   */
  private async fetchFromHtmlOnly(result: FetchResult): Promise<FetchResult> {
    console.log('🌐 模式: 纯 HTML 抓取（降级）');

    // 获取已存在的 post ID
    const existingPostIds = await this.getExistingPostIds();

    // 抓取 HTML（会自动判断抓几页）
    const htmlArticles = await this.homepageFetcher.fetchArticles(
      20, // 预期数量（用于决定页数）
      existingPostIds
    );

    result.fetched = htmlArticles.length;

    if (htmlArticles.length === 0) {
      console.log('✓ HTML 返回 0 条记录');
      return result;
    }

    console.log(`🔗 从 HTML 提取 ${htmlArticles.length} 篇文章`);

    // 处理每篇文章
    for (const htmlData of htmlArticles) {
      try {
        // 检查是否已存在
        if (existingPostIds.has(htmlData.postId)) {
          result.duplicates++;
          continue;
        }

        // 使用纯 HTML 数据创建 Deal（没有 API 内容）
        const deal = await this.normalizer.normalizeFromHtmlOnly(htmlData);

        // 处理联盟链接
        if (deal.merchantLink) {
          const affiliateResult = await this.affiliateLinkService.processAffiliateLink(
            deal.merchant,
            deal.canonicalMerchantName,
            deal.merchantLink
          );

          if (affiliateResult.enabled && affiliateResult.affiliateLink) {
            deal.affiliateLink = affiliateResult.affiliateLink;
            deal.affiliateEnabled = true;
            deal.affiliateNetwork = affiliateResult.network;
          }
        }

        // 去重检查
        const dupResult = await this.deduplicator.checkDuplicate(deal);

        if (dupResult.isDuplicate && dupResult.existingDeal) {
          await this.deduplicator.handleDuplicate(dupResult.existingDeal.id, deal);
          result.duplicates++;
          console.log(`🔁 重复: ${deal.titleDe || deal.originalTitle}`);
        } else {
          await this.database.createDeal(deal);
          result.inserted++;
          console.log(`✅ 新增: ${deal.titleDe || deal.originalTitle} (⚠️  缺少详细内容)`);
        }
      } catch (error) {
        const errorMsg = `处理 Post ${htmlData.postId} 失败: ${(error as Error).message}`;
        console.error(`❌ ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    console.log('\n📊 抓取统计 (降级模式):');
    console.log(`   - 抓取: ${result.fetched}`);
    console.log(`   - 新增: ${result.inserted}`);
    console.log(`   - 重复: ${result.duplicates}`);
    console.log(`   - 错误: ${result.errors.length}`);
    console.log(`   ⚠️  注意: ${result.inserted} 条记录缺少详细内容`);

    return result;
  }

  /**
   * 抓取 API 数据
   */
  private async fetchApi(): Promise<ApiData[]> {
    const url = `${API_URL}?per_page=${API_PER_PAGE}&orderby=date&order=desc`;

    console.log(`📡 抓取 API: ${url}`);

    const response = await axios.get<WordPressPost[]>(url, {
      headers: {
        'User-Agent': process.env.SPARHAMSTER_USER_AGENT ||
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'de-AT,de;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.sparhamster.at/',
        'Origin': 'https://www.sparhamster.at',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
      },
      timeout: 15000,
    });

    const posts = response.data || [];

    // 转换为 ApiData
    return posts.map(post => ({
      postId: post.id.toString(),
      contentHtml: post.content?.rendered || '',
      publishedAt: new Date(post.date),
      modifiedAt: new Date(post.modified),
      link: post.link,
    }));
  }

  /**
   * 获取数据库中已存在的 post ID
   */
  private async getExistingPostIds(): Promise<Set<string>> {
    const existingDeals = await this.database.query(
      `SELECT source_post_id FROM deals WHERE source_site = 'sparhamster' LIMIT 1000`
    ) as { source_post_id: string }[];

    return new Set(existingDeals.map(d => d.source_post_id));
  }

  /**
   * 获取随机延迟（毫秒）
   */
  private getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 休眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取健康监控器状态（用于调试/监控）
   */
  getHealthStatus() {
    return this.healthMonitor.getStatus();
  }
}
