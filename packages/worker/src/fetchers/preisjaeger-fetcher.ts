/**
 * Preisjaeger Fetcher - 完全重写版
 *
 * 新逻辑:
 * 1. 列表页抓取 → 用简述作为临时 description → 去重 → 入库
 * 2. 翻译所有已入库记录
 * 3. 详情页抓取（仅新增）→ 更新完整字段（publishedAt, expiresAt, description等）
 * 4. 链接解析：解密 /visit/homenew/{threadId} → 提取干净 Amazon 链接 → 添加联盟标签
 * 5. 配置优先级：.env.local > .env
 */

import axios from 'axios';
import { load as cheerioLoad } from 'cheerio';
import { DatabaseManager } from '../database';
import { PreisjaegerNormalizer, PreisjaegerListItem, PreisjaegerDetailItem } from '../normalizers/preisjaeger-normalizer';
import { DeduplicationService } from '../services/deduplication-service';
import { AffiliateLinkService } from '../services/affiliate-link-service';
import { FetchResult } from '../types/fetcher.types';
import { Deal } from '../types/deal.types';

/**
 * Preisjaeger Fetcher
 */
export class PreisjaegerFetcher {
  private readonly normalizer: PreisjaegerNormalizer;
  private readonly deduplicator: DeduplicationService;
  private readonly affiliateLinkService: AffiliateLinkService;

  constructor(private readonly database: DatabaseManager) {
    this.normalizer = new PreisjaegerNormalizer();
    this.deduplicator = new DeduplicationService(database);
    this.affiliateLinkService = new AffiliateLinkService();
  }

  /**
   * 主抓取方法 - 完全重写版
   * 流程：列表页→去重→入库（简述）→详情页→更新完整信息
   */
  async fetchLatest(): Promise<FetchResult> {
    // 读取配置（从环境变量，.env.local > .env）
    // 注意：不提供默认值，强制从 .env 文件读取
    const LIST_URL = process.env.PREISJAEGER_LIST_URL;
    const MAX_DETAIL_PAGES = Number(process.env.PREISJAEGER_MAX_DETAIL_PAGES);
    const DETAIL_MIN_DELAY = Number(process.env.PREISJAEGER_DETAIL_MIN_DELAY);
    const DETAIL_MAX_DELAY = Number(process.env.PREISJAEGER_DETAIL_MAX_DELAY);

    if (!LIST_URL) {
      throw new Error('PREISJAEGER_LIST_URL 未配置，请检查 .env 或 .env.local 文件');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 开始抓取 Preisjaeger');
    console.log(`⚙️  配置: MAX=${MAX_DETAIL_PAGES}, DELAY=${DETAIL_MIN_DELAY}-${DETAIL_MAX_DELAY}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const result: FetchResult = {
      fetched: 0,
      inserted: 0,
      updated: 0,
      duplicates: 0,
      errors: [],
    };

    try {
      // ========================================
      // Step 1: 抓取列表页 - 获取所有商品基础信息
      // ========================================
      console.log(`\n📡 Step 1: 抓取列表页: ${LIST_URL}`);
      const listItems = await this.fetchListPage(LIST_URL);
      console.log(`📥 列表页返回 ${listItems.length} 条记录`);

      if (listItems.length === 0) {
        console.log('✓ 列表页无数据，跳过');
        return result;
      }

      // ========================================
      // Step 2: 去重检查 - 区分新商品和重复商品
      // ========================================
      console.log(`\n🔍 Step 2: 去重检查...`);
      const threadIds = listItems.map(item => item.threadId);
      const existingThreadIds = await this.getExistingThreadIds(threadIds);
      const newItems = listItems.filter(item => !existingThreadIds.has(item.threadId));
      const duplicateItems = listItems.filter(item => existingThreadIds.has(item.threadId));

      console.log(`📊 去重结果: 新商品 ${newItems.length} 个, 重复 ${duplicateItems.length} 个`);
      result.duplicates = duplicateItems.length;

      // ========================================
      // Step 3: 处理新商品 - 用列表页简述作为临时描述，写入数据库
      // ========================================
      console.log(`\n💾 Step 3: 处理新商品（列表页数据）...`);

      const newDeals: Array<{ listItem: PreisjaegerListItem; dealId: string }> = [];

      for (let i = 0; i < newItems.length; i++) {
        const listItem = newItems[i];

        try {
          console.log(`📦 [${i + 1}/${newItems.length}] 处理: ${listItem.title}`);

          // 标准化列表页数据（使用简述作为临时 description）
          const deal = await this.normalizer.normalizeFromList(listItem);

          // 二次去重检查（基于内容hash）
          const dupResult = await this.deduplicator.checkDuplicate(deal);

          if (dupResult.isDuplicate && dupResult.existingDeal) {
            // 重复记录 - 更新动态信息
            await this.deduplicator.handleDuplicate(dupResult.existingDeal.id, deal);
            result.duplicates++;
            console.log(`🔁 重复(已更新价格等): ${deal.titleDe}`);
          } else {
            // 插入新记录
            const newDealId = await this.database.createDeal(deal);
            newDeals.push({ listItem, dealId: newDealId });
            result.inserted++;
            console.log(`✅ 新增: ${deal.titleDe}`);
          }
        } catch (error) {
          const errorMsg = `处理 Thread ${listItem.threadId} 失败: ${(error as Error).message}`;
          console.error(`❌ ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }

      console.log(`\n📊 列表页处理完成: 新增 ${result.inserted} 个, 重复 ${result.duplicates} 个`);

      // ========================================
      // Step 4: 抓取详情页 - 只抓新商品，更新完整信息
      // ========================================
      const itemsToFetchDetail = newDeals.slice(0, MAX_DETAIL_PAGES);

      if (newDeals.length === 0) {
        console.log('\n✓ 没有新商品需要抓取详情页');
        return result;
      }

      if (newDeals.length > MAX_DETAIL_PAGES) {
        console.log(`\n⚠️  新商品超过限制 (${newDeals.length}), 只抓取前 ${MAX_DETAIL_PAGES} 个详情页`);
      }

      console.log(`\n🔍 Step 4: 抓取详情页（${itemsToFetchDetail.length} 个新商品）...`);
      result.fetched = itemsToFetchDetail.length;

      const MAX_CONSECUTIVE_ERRORS = 3;
      let consecutiveErrors = 0;

      for (let i = 0; i < itemsToFetchDetail.length; i++) {
        const { listItem, dealId } = itemsToFetchDetail[i];

        try {
          // 随机延迟（第一个不延迟）
          if (i > 0) {
            const delay = this.getRandomDelay(DETAIL_MIN_DELAY, DETAIL_MAX_DELAY);
            console.log(`⏳ 延迟 ${(delay / 1000).toFixed(1)} 秒...`);
            await this.sleep(delay);
          }

          // 抓取详情页
          console.log(`📄 [${i + 1}/${itemsToFetchDetail.length}] 抓取详情页: ${listItem.title}`);
          const detailItem = await this.fetchDetailPage(listItem, i < 3);

          // 构建详情页更新数据（包含 publishedAt, expiresAt, 完整 description 等）
          const detailUpdate = await this.buildDetailUpdate(detailItem, listItem);

          // 更新数据库
          await this.database.updateDeal(dealId, detailUpdate);
          result.updated++;
          console.log(`🔄 更新完成: ${listItem.title}`);

          // 成功后重置错误计数
          consecutiveErrors = 0;
        } catch (error) {
          consecutiveErrors++;
          const errorMsg = `抓取详情页失败 Thread ${listItem.threadId}: ${(error as Error).message}`;
          console.warn(`⚠️  ${errorMsg} (保留列表页数据)`);
          result.errors.push(errorMsg);

          // 检测连续错误
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            console.error(`\n❌ 连续失败 ${MAX_CONSECUTIVE_ERRORS} 次，停止抓取详情页`);
            console.error(`   已成功更新 ${result.updated} 个，剩余 ${itemsToFetchDetail.length - i - 1} 个保留列表页数据\n`);
            break;
          }
        }
      }

      console.log('\n📊 抓取统计:');
      console.log(`   - 抓取: ${result.fetched}`);
      console.log(`   - 新增: ${result.inserted}`);
      console.log(`   - 更新: ${result.updated}`);
      console.log(`   - 重复: ${result.duplicates}`);
      console.log(`   - 错误: ${result.errors.length}`);

      return result;
    } catch (error) {
      const errorMsg = `Preisjaeger 抓取失败: ${(error as Error).message}`;
      console.error(`❌ ${errorMsg}`);
      result.errors.push(errorMsg);
      return result;
    }
  }

  /**
   * 构建详情页更新数据
   * 更新详情页特有的字段：发布时间、过期时间、完整描述、商家链接等
   * 如果详情页描述为空，保留列表页简述
   */
  private async buildDetailUpdate(
    detailItem: PreisjaegerDetailItem,
    listItem: PreisjaegerListItem
  ): Promise<Partial<Deal>> {
    // 使用 normalizer 获取完整标准化数据
    const fullDeal = await this.normalizer.normalize(detailItem);

    // 基础更新数据
    const updateData: Partial<Deal> = {
      // 时间信息（详情页特有）
      publishedAt: fullDeal.publishedAt,
      expiresAt: fullDeal.expiresAt,
      updatedAt: fullDeal.updatedAt,

      // 商家链接（详情页可能更准确）
      merchantLink: fullDeal.merchantLink,
      affiliateLink: fullDeal.affiliateLink,
      affiliateEnabled: fullDeal.affiliateEnabled,
      affiliateNetwork: fullDeal.affiliateNetwork,

      // 价格（可能更新）
      price: fullDeal.price,
      originalPrice: fullDeal.originalPrice,
      discount: fullDeal.discount,

      // 图片（详情页可能更完整）
      imageUrl: fullDeal.imageUrl,
      images: fullDeal.images,

      // 分类（详情页更完整）
      categories: fullDeal.categories,

      // 优惠码
      couponCode: fullDeal.couponCode,

      // 原始数据（保留详情）
      rawPayload: {
        list: listItem,
        detail: detailItem,
      },
    };

    // 描述逻辑：如果详情页有完整描述，替换简述；否则保留列表页简述
    if (fullDeal.contentHtml || fullDeal.contentText) {
      updateData.contentHtml = fullDeal.contentHtml;
      updateData.contentText = fullDeal.contentText;
      updateData.description = fullDeal.description;
      updateData.originalDescription = fullDeal.originalDescription;
      console.log(`   ✓ 详情页有完整描述，已替换`);
    } else {
      console.log(`   ⚠️  详情页无描述，保留列表页简述`);
    }

    // ✅ 不包含以下字段，避免覆盖：
    // - duplicateCount (由 handleDuplicate 管理)
    // - firstSeenAt (创建时设置)
    // - translationStatus (由翻译流程管理)
    // - isTranslated (由翻译流程管理)
    // - createdAt (创建时设置)

    return updateData;
  }

  /**
   * 抓取列表页
   */
  private async fetchListPage(url: string): Promise<PreisjaegerListItem[]> {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': process.env.PREISJAEGER_USER_AGENT ||
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-AT,de;q=0.9,en;q=0.7',
      },
      timeout: 30000,
    });

    const $ = cheerioLoad(response.data);
    const items: PreisjaegerListItem[] = [];

    // 遍历所有 article 元素（每个商品）
    $('article[id^="thread_"]').each((_, article) => {
      try {
        const $article = $(article);

        // 1. 从 data-vue3 提取基础数据
        const $vueElement = $article.find('[data-vue3]').first();
        const dataVue3 = $vueElement.attr('data-vue3');
        if (!dataVue3) return;

        const vueData = JSON.parse(dataVue3);
        if (vueData.name === 'ThreadMainListItemNormalizer' && vueData.props?.thread) {
          const thread = vueData.props.thread as PreisjaegerListItem;
          if (!thread.threadId || !thread.title) return;

          // 2. 从 HTML 提取简述（在 .userHtml-content 里）
          const $description = $article.find('.userHtml-content');
          if ($description.length > 0) {
            const descriptionText = $description.text().trim();
            if (descriptionText) {
              thread.descriptionHtml = descriptionText;
              console.log(`   ✓ 提取简述 (${thread.threadId}): ${descriptionText.substring(0, 80)}...`);
            }
          }

          // 3. 尝试从 metadata 提取（备用方案）
          if (!thread.descriptionHtml) {
            const metadata = (thread as any).metadata;
            if (metadata?.description) {
              thread.descriptionHtml = metadata.description;
            }
          }

          items.push(thread);
        }
      } catch (error) {
        console.warn(`解析商品失败: ${(error as Error).message}`);
      }
    });

    return items;
  }

  /**
   * 抓取详情页
   */
  private async fetchDetailPage(listItem: PreisjaegerListItem, saveHtml = false): Promise<PreisjaegerDetailItem> {
    const detailUrl = `https://www.preisjaeger.at/deals/${listItem.titleSlug}-${listItem.threadId}`;

    const response = await axios.get(detailUrl, {
      headers: {
        'User-Agent': process.env.PREISJAEGER_USER_AGENT ||
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 30000,
    });

    const html = response.data;

    // 保存HTML(调试用)
    if (saveHtml) {
      try {
        const fs = await import('fs/promises');
        const path = `/tmp/thread_${listItem.threadId}.html`;
        await fs.writeFile(path, html, 'utf-8');
        console.log(`   💾 已保存HTML: ${path}`);
      } catch (error) {
        console.warn(`   ⚠️  保存HTML失败: ${(error as Error).message}`);
      }
    }

    // 提取 __INITIAL_STATE__
    const initialStateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/s);
    if (!initialStateMatch) {
      throw new Error(`无法从详情页提取 __INITIAL_STATE__`);
    }

    const initialState = JSON.parse(initialStateMatch[1]);
    const threadDetail = initialState.threadDetail;

    if (!threadDetail || !threadDetail.threadId) {
      throw new Error('threadDetail 数据不完整');
    }

    return threadDetail as PreisjaegerDetailItem;
  }

  /**
   * 获取已存在的 threadIds (精确查询)
   */
  private async getExistingThreadIds(threadIds: string[]): Promise<Set<string>> {
    if (threadIds.length === 0) {
      return new Set();
    }

    const query = `
      SELECT source_post_id
      FROM deals
      WHERE source_site = 'preisjaeger'
        AND source_post_id = ANY($1::text[])
    `;

    const result = await this.database.query(query, [threadIds]) as { source_post_id: string }[];
    return new Set(result.map(r => r.source_post_id));
  }

  /**
   * 获取随机延迟
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
}
