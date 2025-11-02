/**
 * Deal 数据模型类型定义
 * 用于统一的优惠信息数据结构,支持多数据源
 */

/**
 * 内容块类型
 * 用于结构化表示文章内容
 */
export interface ContentBlock {
  type: 'text' | 'heading' | 'image' | 'list' | 'code' | 'quote';
  content: string;
  metadata?: Record<string, any>;
}

/**
 * Deal 主数据模型
 * 包含所有优惠信息的完整字段
 */
export interface Deal {
  // 唯一标识
  id: string;

  // 数据源信息
  sourceSite: string;           // 数据来源站点 (如 'sparhamster')
  sourcePostId?: string;         // 源站帖子 ID
  feedId?: string;               // RSS Feed ID (如适用)
  guid: string;                  // 全局唯一标识符 (通常是 URL)
  slug?: string;                 // URL slug
  contentHash?: string;          // 内容哈希,用于去重

  // 标题与描述
  title?: string;                // 翻译后的标题
  originalTitle?: string;        // 原始标题
  description?: string;          // 翻译后的描述
  originalDescription?: string;  // 原始描述

  // 内容
  contentHtml?: string;          // HTML 格式内容
  contentText?: string;          // 纯文本内容
  contentBlocks?: ContentBlock[]; // 结构化内容块

  // 链接与图片
  link: string;                  // 优惠链接 (商家链接或转发链接)
  imageUrl?: string;             // 主图片 URL
  images?: string[];             // 所有图片 URL 列表

  // 商家信息
  merchant?: string;             // 商家名称 (原始)
  merchantLogo?: string;         // 商家 Logo URL
  merchantLink?: string;         // 商家原始链接 (从首页HTML获取)
  fallbackLink?: string;         // 临时回退链接 (文章URL,当merchantLink未抓到时使用)

  // 规范商家信息 (用于统一展示和筛选)
  canonicalMerchantId?: string;  // 规范商家ID (用于URL和API)
  canonicalMerchantName?: string; // 规范商家显示名称 (前端展示用)

  // 联盟链接 (STEP6 实现)
  affiliateLink?: string;        // 替换后的联盟链接
  affiliateEnabled: boolean;     // 是否启用联盟链接
  affiliateNetwork?: string;     // 联盟网络 (如 'amazon', 'awin')

  // 价格信息
  price?: number;                // 当前价格
  originalPrice?: number;        // 原价
  discount?: number;             // 折扣百分比
  currency: string;              // 货币代码 (如 'EUR', 'USD')
  couponCode?: string;           // 优惠码
  priceUpdateNote?: string;      // 价格更新说明（如 "Der Preis fällt auf..."）
  previousPrice?: number;        // 上次观察到的价格

  // 分类与标签
  categories?: string[];         // 分类列表
  tags?: string[];               // 标签列表

  // 时间信息
  publishedAt?: Date;            // 发布时间
  expiresAt?: Date;              // 过期时间

  // 翻译状态
  language: string;              // 目标语言 (如 'zh', 'en')
  translationStatus: 'pending' | 'processing' | 'completed' | 'failed';
  translationProvider?: string;  // 翻译服务提供商 (如 'deepl')
  translationLanguage?: string;  // 翻译后的语言
  translationDetectedLanguage?: string; // 检测到的原始语言
  isTranslated: boolean;         // 是否已翻译

  // 元数据
  rawPayload?: any;              // 原始 API 响应数据 (JSON)
  duplicateCount: number;        // 重复出现次数
  firstSeenAt: Date;             // 首次发现时间
  lastSeenAt: Date;              // 最后一次看到时间
  createdAt: Date;               // 创建时间
  updatedAt: Date;               // 更新时间
}

/**
 * 创建 Deal 时的输入类型
 * 排除数据库自动生成的字段
 */
export type CreateDealInput = Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * 更新 Deal 时的输入类型
 * 所有字段都是可选的
 */
export type UpdateDealInput = Partial<Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * 数据库行映射到 Deal 对象的辅助类型
 * snake_case 字段名 -> camelCase
 */
export interface DealRow {
  id: string;
  source_site: string;
  source_post_id?: string;
  feed_id?: string;
  guid: string;
  slug?: string;
  content_hash?: string;

  title?: string;
  original_title?: string;
  description?: string;
  original_description?: string;

  content_html?: string;
  content_text?: string;
  content_blocks?: string; // JSON string

  link: string;
  image_url?: string;
  images?: string; // JSON array string

  merchant?: string;
  merchant_logo?: string;
  merchant_link?: string;
  fallback_link?: string;

  canonical_merchant_id?: string;
  canonical_merchant_name?: string;

  affiliate_link?: string;
  affiliate_enabled: boolean;
  affiliate_network?: string;

  price?: number;
  original_price?: number;
  discount?: number;
  currency: string;
  coupon_code?: string;
  price_update_note?: string;
  previous_price?: number;

  categories?: string; // JSON array string
  tags?: string; // JSON array string

  published_at?: Date;
  expires_at?: Date;

  language: string;
  translation_status: 'pending' | 'processing' | 'completed' | 'failed';
  translation_provider?: string;
  translation_language?: string;
  translation_detected_language?: string;
  is_translated: boolean;

  raw_payload?: string; // JSON string
  duplicate_count: number;
  first_seen_at: Date;
  last_seen_at: Date;
  created_at: Date;
  updated_at: Date;
}
