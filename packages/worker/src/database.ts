/**
 * 数据库连接和操作
 */

import { Pool, PoolClient } from 'pg';
import { RSSFeed, RSSItem, TranslationJob } from './types';

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
    return result.rows;
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
}