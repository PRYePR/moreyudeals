/**
 * 数据库连接和操作
 */

import { Pool, PoolClient } from 'pg';
import { RSSFeed, RSSItem, TranslationJob } from './types';

interface DealUpsertInput {
  feedId: string;
  guid: string;
  link: string;
  pubDate: Date;
  categories: string[];
  originalTitle: string;
  originalDescription: string;
  title: string;
  description: string;
  imageUrl?: string;
  price?: number | null;
  originalPrice?: number | null;
  discount?: number | null;
  contentHtml?: string | null;
  contentText?: string | null;
  merchantName?: string | null;
  merchantLogo?: string | null;
  currency?: string | null;
  expiresAt?: Date | null;
  language?: string;
  detectedLanguage?: string;
}

export class DatabaseManager {
  private pool: Pool;

  constructor(config: any) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
    });
  }

  private mapRowToRSSFeed(row: any): RSSFeed {
    return {
      id: row.id,
      name: row.name,
      url: row.url,
      category: row.category,
      language: (row.language || 'de') as RSSFeed['language'],
      enabled: row.enabled ?? true,
      lastFetched: row.last_fetched ? new Date(row.last_fetched) : undefined,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };
  }

  private mapRowToRSSItem(row: any): RSSItem {
    const categoriesValue = row.categories;
    const categories = Array.isArray(categoriesValue)
      ? categoriesValue.map(String)
      : categoriesValue
        ? JSON.parse(categoriesValue)
        : [];

    return {
      id: row.id,
      feedId: row.feed_id,
      guid: row.guid,
      title: row.title || '',
      originalTitle: row.original_title || '',
      description: row.description || '',
      originalDescription: row.original_description || '',
      link: row.link,
      pubDate: row.pub_date ? new Date(row.pub_date) : new Date(),
      categories,
      imageUrl: row.image_url || undefined,
      price: row.price !== null && row.price !== undefined ? Number(row.price) : undefined,
      originalPrice:
        row.original_price !== null && row.original_price !== undefined
          ? Number(row.original_price)
          : undefined,
      discount:
        row.discount !== null && row.discount !== undefined ? Number(row.discount) : undefined,
      isTranslated: row.is_translated ?? false,
      translationStatus: row.translation_status || 'pending',
      translationProvider: row.translation_provider || undefined,
      translationLanguage: row.translation_language || undefined,
      translationDetectedLanguage: row.translation_detected_language || undefined,
      contentHtml: row.content_html || undefined,
      contentText: row.content_text || undefined,
      merchantName: row.merchant_name || undefined,
      merchantLogo: row.merchant_logo || undefined,
      currency: row.currency || undefined,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };
  }

  private mapRowToTranslationJob(row: any): TranslationJob {
    return {
      id: row.id,
      itemId: row.item_id,
      type: row.type,
      originalText: row.original_text,
      translatedText: row.translated_text || undefined,
      sourceLanguage: row.source_language,
      targetLanguage: row.target_language,
      status: row.status,
      provider: row.provider || undefined,
      retryCount: row.retry_count ?? 0,
      errorMessage: row.error_message || undefined,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };
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

  // RSS Feeds 操作
  async getRSSFeeds(): Promise<RSSFeed[]> {
    const query = `
      SELECT * FROM rss_feeds
      WHERE enabled = true
      ORDER BY created_at ASC
    `;
    const result = await this.pool.query(query);
    return result.rows.map((row) => this.mapRowToRSSFeed(row));
  }

  async updateFeedLastFetched(feedId: string): Promise<void> {
    const query = `
      UPDATE rss_feeds
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
    return result.rows.length > 0 ? this.mapRowToRSSItem(result.rows[0]) : null;
  }

  async createRSSItem(item: Omit<RSSItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const query = `
      INSERT INTO rss_items (
        feed_id,
        guid,
        title,
        original_title,
        description,
        original_description,
        link,
        pub_date,
        categories,
        image_url,
        price,
        original_price,
        discount,
        is_translated,
        translation_status,
        created_at,
        updated_at
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
    return result.rows.map((row) => this.mapRowToTranslationJob(row));
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
     return result.rows.map((row) => this.mapRowToRSSItem(row));
  }

  async upsertDealFromApi(input: DealUpsertInput): Promise<'inserted' | 'updated'> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const existing = await client.query<RSSItem>(
        `
          SELECT *
          FROM rss_items
          WHERE guid = $1
          LIMIT 1
        `,
        [input.guid]
      );

      if (existing.rowCount === 0) {
        await client.query(
          `
            INSERT INTO rss_items (
              feed_id,
              guid,
              title,
              original_title,
              description,
              original_description,
              link,
              pub_date,
              categories,
              image_url,
              price,
              original_price,
              discount,
              is_translated,
              translation_status,
              translation_provider,
              translation_language,
              translation_detected_language,
              content_html,
              content_text,
              merchant_name,
              merchant_logo,
              currency,
              expires_at,
              created_at,
              updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
              false, 'pending', NULL, $14, $15, $16, $17, $18, $19, $20,
              $21, NOW(), NOW()
            )
          `,
          [
            input.feedId,
            input.guid,
            input.title,
            input.originalTitle,
            input.description,
            input.originalDescription,
            input.link,
            input.pubDate,
            JSON.stringify(input.categories),
            input.imageUrl,
            input.price ?? null,
            input.originalPrice ?? null,
            input.discount ?? null,
            input.language || 'de',
            input.detectedLanguage || 'de',
            input.contentHtml ?? null,
            input.contentText ?? null,
            input.merchantName ?? null,
            input.merchantLogo ?? null,
            input.currency ?? 'EUR',
            input.expiresAt ?? null
          ]
        );

        await client.query('COMMIT');
        return 'inserted';
      }

      const existingRow = this.mapRowToRSSItem(existing.rows[0]);

      const needsRetranslation =
        existingRow.originalTitle !== input.originalTitle ||
        existingRow.originalDescription !== input.originalDescription;

      await client.query(
        `
          UPDATE rss_items
          SET
            title = CASE
              WHEN $1 THEN $2
              ELSE title
            END,
            original_title = $3,
            description = CASE
              WHEN $1 THEN $4
              ELSE description
            END,
            original_description = $5,
            link = $6,
            pub_date = $7,
            categories = $8,
            image_url = $9,
            price = $10,
            original_price = $11,
            discount = $12,
            is_translated = CASE
              WHEN $1 THEN false
              ELSE is_translated
            END,
            translation_status = CASE
              WHEN $1 THEN 'pending'
              ELSE translation_status
            END,
            translation_language = COALESCE($13, translation_language),
            translation_detected_language = COALESCE($14, translation_detected_language),
            content_html = $15,
            content_text = $16,
            merchant_name = $17,
            merchant_logo = $18,
            currency = $19,
            expires_at = $20,
            updated_at = NOW()
          WHERE guid = $21
        `,
        [
          needsRetranslation,
          input.title,
          input.originalTitle,
          input.description,
          input.originalDescription,
          input.link,
          input.pubDate,
          JSON.stringify(input.categories),
          input.imageUrl ?? null,
          input.price ?? null,
          input.originalPrice ?? null,
          input.discount ?? null,
          input.language || 'de',
          input.detectedLanguage || 'de',
          input.contentHtml ?? null,
          input.contentText ?? null,
          input.merchantName ?? null,
          input.merchantLogo ?? null,
          input.currency ?? 'EUR',
          input.expiresAt ?? null,
          input.guid
        ]
      );

      await client.query('COMMIT');
      return 'updated';
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
