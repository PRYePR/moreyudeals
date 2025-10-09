/**
 * RSS Feed抓取器
 *
 * 说明：
 *  - 默认情况下我们使用官方 API 进行抓取（见 sparhamster-api-fetcher.ts）
 *  - 该模块仅作为备用方案保留，必要时可以手动调用
 */

import Parser from 'rss-parser';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { RSSFeed, RSSItem, FetchResult } from './types';
import { DatabaseManager } from './database';

export class RSSFetcher {
  private parser: Parser;
  private database: DatabaseManager;

  constructor(database: DatabaseManager) {
    this.database = database;
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Moreyudeals/1.0; +https://moreyudeals.com)'
      }
    });
  }

  async fetchFeed(feed: RSSFeed): Promise<FetchResult> {
    console.log(`🔄 开始抓取RSS: ${feed.name} (${feed.url})`);

    const result: FetchResult = {
      feedId: feed.id,
      newItems: 0,
      updatedItems: 0,
      errors: []
    };

    try {
      // 抓取RSS内容
      const rssData = await this.parser.parseURL(feed.url);

      if (!rssData.items || rssData.items.length === 0) {
        result.errors.push('RSS feed为空');
        return result;
      }

      console.log(`📄 获取到 ${rssData.items.length} 个RSS条目`);

      // 处理每个RSS条目
      for (const item of rssData.items) {
        try {
          await this.processRSSItem(feed, item, result);
        } catch (error) {
          const errorMsg = `处理RSS条目失败: ${(error as Error).message}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      // 更新Feed的最后抓取时间
      await this.database.updateFeedLastFetched(feed.id);

      console.log(`✅ RSS抓取完成: 新增${result.newItems}条，更新${result.updatedItems}条`);

    } catch (error) {
      const errorMsg = `RSS抓取失败: ${(error as Error).message}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
    }

    return result;
  }

  private async processRSSItem(feed: RSSFeed, item: any, result: FetchResult): Promise<void> {
    const guid = item.guid || item.link || item.title;
    if (!guid) {
      throw new Error('RSS条目缺少唯一标识');
    }

    // 检查是否已存在
    const existingItem = await this.database.getItemByGuid(feed.id, guid);

    if (existingItem) {
      // 检查是否需要更新
      const shouldUpdate = this.shouldUpdateItem(existingItem, item);
      if (shouldUpdate) {
        await this.updateRSSItem(existingItem, item);
        result.updatedItems++;
      }
    } else {
      // 创建新条目
      await this.createRSSItem(feed, item, guid);
      result.newItems++;
    }
  }

  private async createRSSItem(feed: RSSFeed, item: any, guid: string): Promise<void> {
    // 解析基本信息
    const title = this.cleanText(item.title || '');
    const description = this.cleanText(item.contentSnippet || item.content || '');
    const link = item.link || '';
    const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
    const categories = item.categories || [];

    // 提取价格和折扣信息
    const priceInfo = this.extractPriceInfo(title, description);

    // 提取图片
    const imageUrl = await this.extractImageUrl(item, link);

    const rssItem: Omit<RSSItem, 'id' | 'createdAt' | 'updatedAt'> = {
      feedId: feed.id,
      guid,
      title: title,
      originalTitle: title,
      description: description,
      originalDescription: description,
      link,
      pubDate,
      categories,
      imageUrl,
      price: priceInfo.price,
      originalPrice: priceInfo.originalPrice,
      discount: priceInfo.discount,
      isTranslated: false,
      translationStatus: 'pending'
    };

    await this.database.createRSSItem(rssItem);
    console.log(`📝 新增RSS条目: ${title.substring(0, 50)}...`);
  }

  private async updateRSSItem(existingItem: RSSItem, item: any): Promise<void> {
    const updates: Partial<RSSItem> = {};

    const newTitle = this.cleanText(item.title || '');
    const newDescription = this.cleanText(item.contentSnippet || item.content || '');

    if (newTitle !== existingItem.originalTitle) {
      updates.originalTitle = newTitle;
      updates.title = newTitle;
      updates.isTranslated = false;
      updates.translationStatus = 'pending';
    }

    if (newDescription !== existingItem.originalDescription) {
      updates.originalDescription = newDescription;
      updates.description = newDescription;
      updates.isTranslated = false;
      updates.translationStatus = 'pending';
    }

    if (Object.keys(updates).length > 0) {
      await this.database.updateRSSItem(existingItem.id, updates);
      console.log(`🔄 更新RSS条目: ${existingItem.title.substring(0, 50)}...`);
    }
  }

  private shouldUpdateItem(existingItem: RSSItem, newItem: any): boolean {
    const newTitle = this.cleanText(newItem.title || '');
    const newDescription = this.cleanText(newItem.contentSnippet || newItem.content || '');

    return (
      newTitle !== existingItem.originalTitle ||
      newDescription !== existingItem.originalDescription
    );
  }

  private cleanText(text: string): string {
    if (!text) return '';

    // 移除HTML标签
    const $ = cheerio.load(text);
    const cleanText = $.text();

    // 清理多余空白字符
    return cleanText.replace(/\s+/g, ' ').trim();
  }

  private extractPriceInfo(title: string, description: string): {
    price?: number;
    originalPrice?: number;
    discount?: number;
  } {
    const text = `${title} ${description}`.toLowerCase();

    // 匹配价格模式 (€, EUR, $)
    const priceRegex = /(?:€|eur|usd|\$)\s*(\d+(?:[.,]\d{2})?)/gi;
    const prices: number[] = [];

    let match;
    while ((match = priceRegex.exec(text)) !== null) {
      const price = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(price)) {
        prices.push(price);
      }
    }

    // 匹配折扣百分比
    const discountRegex = /(\d+)%\s*(?:off|rabatt|discount)/gi;
    const discountMatch = discountRegex.exec(text);
    const discount = discountMatch ? parseInt(discountMatch[1]) : undefined;

    if (prices.length === 0) {
      return { discount };
    }

    if (prices.length === 1) {
      return { price: prices[0], discount };
    }

    // 如果有多个价格，假设第一个是当前价格，第二个是原价
    return {
      price: Math.min(...prices),
      originalPrice: Math.max(...prices),
      discount
    };
  }

  private async extractImageUrl(item: any, link: string): Promise<string | undefined> {
    // 尝试从RSS item中提取图片
    if (item.enclosure?.url) {
      const url = item.enclosure.url;
      if (this.isImageUrl(url)) {
        return url;
      }
    }

    // 尝试从description中提取图片
    if (item.content) {
      const $ = cheerio.load(item.content);
      const img = $('img').first();
      if (img.length > 0) {
        const src = img.attr('src');
        if (src && this.isImageUrl(src)) {
          return this.resolveUrl(src, link);
        }
      }
    }

    return undefined;
  }

  private isImageUrl(url: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.includes(ext));
  }

  private resolveUrl(url: string, baseUrl: string): string {
    if (url.startsWith('http')) {
      return url;
    }

    try {
      const base = new URL(baseUrl);
      return new URL(url, base.origin).toString();
    } catch {
      return url;
    }
  }

  async fetchAllFeeds(): Promise<FetchResult[]> {
    const feeds = await this.database.getRSSFeeds();
    const results: FetchResult[] = [];

    console.log(`🎯 开始抓取 ${feeds.length} 个RSS源`);

    for (const feed of feeds) {
      try {
        const result = await this.fetchFeed(feed);
        results.push(result);
      } catch (error) {
        console.error(`❌ 抓取RSS源失败: ${feed.name}`, error);
        results.push({
          feedId: feed.id,
          newItems: 0,
          updatedItems: 0,
          errors: [(error as Error).message]
        });
      }
    }

    return results;
  }
}
