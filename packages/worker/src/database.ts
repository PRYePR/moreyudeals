/**
 * 数据库连接和操作
 */

import { Pool, PoolClient } from 'pg';
import { RSSFeed, RSSItem, TranslationJob } from './types';
import { Deal } from './types/deal.types';

export class DatabaseManager {
  private pool: Pool;

  constructor(config: any) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user || config.username, // Support both 'user' and 'username'
      password: config.password,
    });
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✅ 数据库连接成功');
    } catch (error) {
      console.error('❌ 数据库连接失败:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    console.log('🔌 数据库连接已关闭');
  }

  /**
   * 执行原始 SQL 查询
   * 主要用于测试和调试
   */
  async query(sql: string, params?: any[]): Promise<any[]> {
    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  // Data Sources 操作 (原 RSS Feeds)
  async getRSSFeeds(): Promise<RSSFeed[]> {
    const query = `
      SELECT * FROM data_sources
      WHERE enabled = true
      ORDER BY created_at ASC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async updateFeedLastFetched(feedId: string): Promise<void> {
    const query = `
      UPDATE data_sources
      SET last_fetched = NOW(), updated_at = NOW()
      WHERE id = $1
    `;
    await this.pool.query(query, [feedId]);
  }

  // RSS Items 操作
  async getItemByGuid(feedId: string, guid: string): Promise<RSSItem | null> {
    const query = `
      SELECT * FROM rss_items
      WHERE feed_id = $1 AND guid = $2
    `;
    const result = await this.pool.query(query, [feedId, guid]);
    return result.rows[0] || null;
  }

  async createRSSItem(item: Omit<RSSItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const query = `
      INSERT INTO rss_items (
        feed_id, guid, title, original_title, description, original_description,
        link, pub_date, categories, image_url, price, original_price, discount,
        is_translated, translation_status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
      ) RETURNING id
    `;

    const values = [
      item.feedId,
      item.guid,
      item.title,
      item.originalTitle,
      item.description,
      item.originalDescription,
      item.link,
      item.pubDate,
      JSON.stringify(item.categories),
      item.imageUrl,
      item.price,
      item.originalPrice,
      item.discount,
      item.isTranslated,
      item.translationStatus
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].id;
  }

  async updateRSSItem(id: string, updates: Partial<RSSItem>): Promise<void> {
    const setClause = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const columnName = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        setClause.push(`${columnName} = $${paramCount}`);
        values.push(key === 'categories' ? JSON.stringify(value) : value);
        paramCount++;
      }
    }

    if (setClause.length === 0) return;

    setClause.push(`updated_at = NOW()`);
    const query = `UPDATE rss_items SET ${setClause.join(', ')} WHERE id = $${paramCount}`;
    values.push(id);

    await this.pool.query(query, values);
  }

  // 翻译任务操作
  async createTranslationJob(job: Omit<TranslationJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const query = `
      INSERT INTO translation_jobs (
        item_id, type, original_text, source_language, target_language,
        status, retry_count, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      ) RETURNING id
    `;

    const values = [
      job.itemId,
      job.type,
      job.originalText,
      job.sourceLanguage,
      job.targetLanguage,
      job.status,
      job.retryCount
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].id;
  }

  async getPendingTranslationJobs(limit: number = 10): Promise<TranslationJob[]> {
    const query = `
      SELECT * FROM translation_jobs
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT $1
    `;
    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }

  async updateTranslationJob(id: string, updates: Partial<TranslationJob>): Promise<void> {
    const setClause = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const columnName = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        setClause.push(`${columnName} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (setClause.length === 0) return;

    setClause.push(`updated_at = NOW()`);
    const query = `UPDATE translation_jobs SET ${setClause.join(', ')} WHERE id = $${paramCount}`;
    values.push(id);

    await this.pool.query(query, values);
  }

  async getUntranslatedItems(limit: number = 50): Promise<RSSItem[]> {
    const query = `
      SELECT * FROM rss_items
      WHERE translation_status = 'pending'
      ORDER BY pub_date DESC
      LIMIT $1
    `;
    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }

  // ==================== Deal 操作 ====================

  /**
   * 创建新 Deal
   */
  async createDeal(deal: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const query = `
      INSERT INTO deals (
        source_site, source_post_id, feed_id, guid, slug, content_hash,
        title, title_de, original_title, description, original_description,
        content_html, content_text, content_blocks,
        link, image_url, images,
        merchant, merchant_logo, merchant_link, fallback_link,
        canonical_merchant_id, canonical_merchant_name,
        affiliate_link, affiliate_enabled, affiliate_network,
        price, original_price, discount, currency, coupon_code,
        price_update_note, previous_price,
        categories, tags,
        published_at, expires_at,
        language, translation_status, translation_provider, translation_language,
        translation_detected_language, is_translated,
        raw_payload, duplicate_count, first_seen_at, last_seen_at,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17,
        $18, $19, $20, $21,
        $22, $23,
        $24, $25, $26,
        $27, $28, $29, $30, $31,
        $32, $33,
        $34, $35,
        $36, $37,
        $38, $39, $40, $41,
        $42, $43,
        $44, $45, $46, $47,
        NOW(), NOW()
      ) RETURNING id
    `;

    // Safe JSON serialization for rawPayload
    let rawPayloadJson: string | null = null;
    if (deal.rawPayload) {
      try {
        rawPayloadJson = JSON.stringify(deal.rawPayload);
      } catch (error) {
        console.warn(`⚠️  无法序列化 rawPayload for deal ${deal.guid}:`, error);
        // Fallback: store minimal info
        rawPayloadJson = JSON.stringify({
          _error: 'Serialization failed',
          _timestamp: new Date().toISOString(),
        });
      }
    }

    const values = [
      deal.sourceSite,
      deal.sourcePostId,
      deal.feedId,
      deal.guid,
      deal.slug,
      deal.contentHash,
      deal.title,
      deal.titleDe,
      deal.originalTitle,
      deal.description,
      deal.originalDescription,
      deal.contentHtml,
      deal.contentText,
      deal.contentBlocks ? JSON.stringify(deal.contentBlocks) : null,
      deal.link,
      deal.imageUrl,
      deal.images ? JSON.stringify(deal.images) : null,
      deal.merchant,
      deal.merchantLogo,
      deal.merchantLink,
      deal.fallbackLink,
      deal.canonicalMerchantId,
      deal.canonicalMerchantName,
      deal.affiliateLink,
      deal.affiliateEnabled,
      deal.affiliateNetwork,
      deal.price,
      deal.originalPrice,
      deal.discount,
      deal.currency,
      deal.couponCode,
      deal.priceUpdateNote,
      deal.previousPrice,
      deal.categories ? JSON.stringify(deal.categories) : null,
      deal.tags ? JSON.stringify(deal.tags) : null,
      deal.publishedAt,
      deal.expiresAt,
      deal.language,
      deal.translationStatus,
      deal.translationProvider,
      deal.translationLanguage,
      deal.translationDetectedLanguage,
      deal.isTranslated,
      rawPayloadJson,
      deal.duplicateCount,
      deal.firstSeenAt,
      deal.lastSeenAt,
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].id;
  }

  /**
   * 根据 source_site + guid 查询 Deal
   */
  async getDealBySourceGuid(sourceSite: string, guid: string): Promise<Deal | null> {
    const query = `
      SELECT * FROM deals
      WHERE source_site = $1 AND guid = $2
      LIMIT 1
    `;
    const result = await this.pool.query(query, [sourceSite, guid]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToDeal(result.rows[0]);
  }

  /**
   * 根据 content_hash 查询 Deal
   * @param contentHash 内容哈希
   * @param daysWindow 可选的时间窗口（天数）
   */
  async getDealByContentHash(contentHash: string, daysWindow?: number): Promise<Deal | null> {
    let query = `
      SELECT * FROM deals
      WHERE content_hash = $1
    `;
    const params: any[] = [contentHash];

    // 如果指定了时间窗口，添加时间过滤（使用参数化查询）
    if (daysWindow) {
      query += ` AND created_at >= NOW() - make_interval(days => $2)`;
      params.push(daysWindow);
    }

    query += ` ORDER BY created_at DESC LIMIT 1`;

    const result = await this.pool.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToDeal(result.rows[0]);
  }

  /**
   * 更新 Deal
   */
  async updateDeal(id: string, updates: Partial<Deal>): Promise<void> {
    const setClause = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        // 转换 camelCase 为 snake_case
        const columnName = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        setClause.push(`${columnName} = $${paramCount}`);

        // 处理 JSON 字段
        if (['contentBlocks', 'images', 'categories', 'tags', 'rawPayload'].includes(key)) {
          values.push(value ? JSON.stringify(value) : null);
        } else {
          values.push(value);
        }
        paramCount++;
      }
    }

    if (setClause.length === 0) return;

    setClause.push(`updated_at = NOW()`);
    const query = `UPDATE deals SET ${setClause.join(', ')} WHERE id = $${paramCount}`;
    values.push(id);

    await this.pool.query(query, values);
  }

  /**
   * 增加重复计数
   */
  async incrementDuplicateCount(id: string): Promise<void> {
    const query = `
      UPDATE deals
      SET
        duplicate_count = duplicate_count + 1,
        last_seen_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `;
    await this.pool.query(query, [id]);
  }

  /**
   * 根据 ID 查询 Deal
   */
  async getDealById(id: string): Promise<Deal | null> {
    const query = `
      SELECT * FROM deals
      WHERE id = $1
      LIMIT 1
    `;
    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToDeal(result.rows[0]);
  }

  /**
   * 获取待翻译的 Deals
   */
  async getUntranslatedDeals(limit: number = 50): Promise<Deal[]> {
    const query = `
      SELECT * FROM deals
      WHERE translation_status = 'pending'
      ORDER BY created_at DESC
      LIMIT $1
    `;
    const result = await this.pool.query(query, [limit]);
    return result.rows.map(row => this.mapRowToDeal(row));
  }

  /**
   * 更新 Deal 的翻译结果
   */
  async updateDealTranslation(
    id: string,
    translations: {
      title?: string;
      description?: string;
      contentBlocks?: any[];
    },
    metadata: {
      provider: string;
      language: string;
      detectedLanguage: string;
    }
  ): Promise<void> {
    const updates: Partial<Deal> = {
      translationStatus: 'completed',
      isTranslated: true,
      translationProvider: metadata.provider,
      translationLanguage: metadata.language,
      translationDetectedLanguage: metadata.detectedLanguage,
    };

    if (translations.title !== undefined) {
      updates.title = translations.title;
    }

    if (translations.description !== undefined) {
      updates.description = translations.description;
    }

    if (translations.contentBlocks !== undefined) {
      updates.contentBlocks = translations.contentBlocks;
    }

    await this.updateDeal(id, updates);
  }

  /**
   * 映射数据库行到 Deal 对象
   */
  private mapRowToDeal(row: any): Deal {
    // Safe JSON parsing helper
    const safeJsonParse = (value: any): any => {
      if (!value) return undefined;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (error) {
          console.warn('⚠️  JSON 解析失败:', error);
          return undefined;
        }
      }
      // Already an object
      return value;
    };

    return {
      id: row.id,
      sourceSite: row.source_site,
      sourcePostId: row.source_post_id,
      feedId: row.feed_id,
      guid: row.guid,
      slug: row.slug,
      contentHash: row.content_hash,
      title: row.title,
      titleDe: row.title_de,
      originalTitle: row.original_title,
      description: row.description,
      originalDescription: row.original_description,
      contentHtml: row.content_html,
      contentText: row.content_text,
      contentBlocks: safeJsonParse(row.content_blocks),
      link: row.link,
      imageUrl: row.image_url,
      images: safeJsonParse(row.images),
      merchant: row.merchant,
      merchantLogo: row.merchant_logo,
      merchantLink: row.merchant_link,
      fallbackLink: row.fallback_link,
      affiliateLink: row.affiliate_link,
      affiliateEnabled: row.affiliate_enabled,
      affiliateNetwork: row.affiliate_network,
      price: row.price,
      originalPrice: row.original_price,
      discount: row.discount,
      currency: row.currency,
      couponCode: row.coupon_code,
      priceUpdateNote: row.price_update_note,
      previousPrice: row.previous_price,
      categories: safeJsonParse(row.categories),
      tags: safeJsonParse(row.tags),
      publishedAt: row.published_at,
      expiresAt: row.expires_at,
      language: row.language,
      translationStatus: row.translation_status,
      translationProvider: row.translation_provider,
      translationLanguage: row.translation_language,
      translationDetectedLanguage: row.translation_detected_language,
      isTranslated: row.is_translated,
      rawPayload: safeJsonParse(row.raw_payload),
      duplicateCount: row.duplicate_count,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}