/**
 * RSS Worker类型定义
 */

export interface RSSFeed {
  id: string;
  name: string;
  url: string;
  category: string;
  language: 'de' | 'en';
  enabled: boolean;
  lastFetched?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RSSItem {
  id: string;
  feedId: string;
  guid: string;
  title: string;
  originalTitle: string;
  description?: string;
  originalDescription?: string;
  link: string;
  pubDate: Date;
  categories: string[];
  imageUrl?: string;
  price?: number;
  originalPrice?: number;
  discount?: number;
  isTranslated: boolean;
  translationStatus: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface TranslationJob {
  id: string;
  itemId: string;
  type: 'title' | 'description';
  originalText: string;
  translatedText?: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  provider?: string;
  retryCount: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkerConfig {
  rssFeeds: RSSFeed[];
  fetchInterval: number; // 分钟
  translationBatchSize: number;
  maxRetries: number;
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  translation: {
    enabled: boolean;
    targetLanguages: string[];
    providers: string[];
  };
}

export interface FetchResult {
  feedId: string;
  newItems: number;
  updatedItems: number;
  errors: string[];
}

export interface TranslationResult {
  itemId: string;
  success: boolean;
  error?: string;
}