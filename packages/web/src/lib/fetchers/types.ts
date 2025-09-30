// 统一的 Deal 数据结构
export interface Deal {
  id: string
  title: string
  originalTitle: string
  translatedTitle: string
  description: string
  originalDescription: string
  translatedDescription: string
  price?: string
  originalPrice?: string
  currency: string
  discountPercentage?: number
  imageUrl: string
  dealUrl: string
  category: string
  source: string
  publishedAt: Date
  expiresAt: Date
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