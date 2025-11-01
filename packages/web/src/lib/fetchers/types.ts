// 统一的 Deal 数据结构
export interface Deal {
  id: string
  title: string
  originalTitle: string
  translatedTitle: string
  description: string
  price?: string
  originalPrice?: string
  currency: string
  discountPercentage?: number
  imageUrl: string
  dealUrl: string
  category: string
  source: string
  publishedAt: Date
  expiresAt?: Date
  language: 'de' | 'en'
  translationProvider: 'deepl' | 'microsoft' | 'google'
  isTranslated: boolean
  categories: string[]
  content: string

  // 可选的扩展字段
  wordpressId?: number
  temperature?: number
  merchantName?: string
  merchantLogo?: string
  commentCount?: number
  viewCount?: number
  tags?: string[]
  featured?: boolean
  voucherCode?: string
  shippingCost?: string

  // 链接追踪相关字段
  affiliateUrl?: string     // 你自己的联盟链接（优先使用）
  originalUrl?: string      // 原始商品链接（无联盟参数）
  trackingUrl?: string      // 内部追踪链接 /api/go/:dealId
  merchantHomepage?: string // 商家主页（fallback）
}

// 数据源配置
export interface FetcherConfig {
  limit?: number
  page?: number
  category?: string
  sortBy?: 'date' | 'price' | 'discount' | 'temperature'
  sortOrder?: 'asc' | 'desc'
}

// 抓取结果
export interface FetchResult {
  deals: Deal[]
  total: number
  source: string
  fetchedAt: Date
  hasMore: boolean
}