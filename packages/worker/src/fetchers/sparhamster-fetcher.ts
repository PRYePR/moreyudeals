/**
 * Sparhamster Fetcher
 * 从 Sparhamster API 抓取优惠信息
 * 集成 Normalizer 和 Deduplication 服务
 */

import axios from 'axios';
import { DatabaseManager } from '../database';
import { SparhamsterNormalizer } from '../normalizers/sparhamster-normalizer';
import { DeduplicationService } from '../services/deduplication-service';
import { FetchResult } from '../types/fetcher.types';
import { WordPressPost } from '../types/wordpress.types';

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

  constructor(private readonly database: DatabaseManager) {
    this.normalizer = new SparhamsterNormalizer();
    this.deduplicator = new DeduplicationService(database);
  }

  /**
   * 抓取最新优惠
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

      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];

        try {
          // 随机延迟 (除第一条)
          if (i > 0) {
            await this.randomDelay(500, 2000);
          }

          const action = await this.processPost(post);

          if (action === 'inserted') {
            result.inserted++;
          } else if (action === 'updated') {
            result.updated++;
          } else if (action === 'duplicate') {
            result.duplicates++;
          }
        } catch (error) {
          const message = `处理帖子 ${post.id} 失败: ${(error as Error).message}`;
          console.error(`❌ ${message}`);
          result.errors.push(message);
        }
      }
    } catch (error) {
      const message = `抓取 Sparhamster API 失败: ${(error as Error).message}`;
      console.error(`❌ ${message}`);
      result.errors.push(message);
    }

    return result;
  }

  /**
   * 处理单个帖子
   */
  private async processPost(
    post: WordPressPost
  ): Promise<'inserted' | 'updated' | 'duplicate'> {
    // 1. 标准化数据
    const deal = await this.normalizer.normalize(post);

    // 2. 检查重复
    const dupResult = await this.deduplicator.checkDuplicate(deal);

    if (dupResult.isDuplicate && dupResult.existingDeal) {
      // 3a. 处理重复
      await this.deduplicator.handleDuplicate(dupResult.existingDeal.id);
      console.log(
        `🔁 检测到重复: ${deal.title} (类型: ${dupResult.duplicateType})`
      );
      return 'duplicate';
    }

    // 3b. 插入新记录
    await this.database.createDeal(deal);
    console.log(
      `✅ 新增 Deal: ${deal.title} (${deal.sourceSite}:${deal.sourcePostId})`
    );
    return 'inserted';
  }

  /**
   * 随机延迟,模拟人类行为
   */
  private async randomDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
