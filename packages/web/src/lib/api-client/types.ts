/**
 * API客户端类型定义
 * 与后端API服务器的接口保持一致
 */

export interface ApiDeal {
  id: string
  title: string
  title_de?: string
  description?: string
  price?: string | number  // 后端返回字符串
  original_price?: string | number | null  // 后端返回字符串或null
  currency: string
  discount?: number | null  // 后端返回number或null
  image_url?: string
  deal_url?: string
  merchant_link?: string
  fallback_link?: string
  affiliate_url?: string | null
  affiliate_link?: string  // 后端实际字段名
  merchant?: string
  canonical_merchant_name?: string
  merchant_logo?: string | null
  categories?: string[]
  tags?: string[]
  source_site?: string  // 后端可能不返回
  link?: string  // 后端实际字段名
  guid?: string  // 后端实际字段名
  source_post_id?: string
  published_at: string
  expires_at?: string | null
  is_featured?: boolean
  coupon_code?: string
  translation_status?: string
  content_html?: string
  translated_content_html?: string
  created_at: string
  updated_at: string
}

export interface ApiDealsResponse {
  data: ApiDeal[]  // 后端API返回的是data,不是deals
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters?: {
    merchants: string[]
    categories: string[]
    priceRange: {
      min: number
      max: number
    }
  }
}

export interface ApiDealDetailResponse {
  deal: ApiDeal
}

export interface ApiCategoriesResponse {
  categories: Array<{
    name: string
    count: number
    slug?: string
  }>
}

export interface ApiStatsResponse {
  totalDeals: number
  activeDeals: number
  merchants: number
  categories: number
  lastUpdated: string
}

export interface ApiMerchantsResponse {
  data: Array<{
    merchant: string
    deal_count: string | number  // 后端返回字符串
    last_deal_at?: string
  }>
}

export interface GetDealsParams {
  page?: number
  limit?: number
  merchant?: string
  category?: string
  min_price?: number
  max_price?: number
  search?: string
  sort?: 'created_at' | 'price' | 'discount' | 'published_at' | 'expires_at'
  order?: 'ASC' | 'DESC'
}

export interface ApiErrorResponse {
  error: string
  message?: string
  statusCode?: number
}

export interface ApiCrossFilterResponse {
  data: {
    categoryByMerchant: Record<string, Record<string, number>>
    merchantByCategory: Record<string, Record<string, number>>
  }
}

/**
 * 前端Deal类型（由converters转换后的格式）
 */
export interface Deal {
  id: string
  title: string
  translatedTitle?: string | null
  titleZh?: string | null  // 中文标题（向后兼容）
  originalTitle: string
  description: string
  translatedDescription?: string | null
  descriptionZh?: string | null  // 中文描述（向后兼容）
  price: number | null
  originalPrice: number | null
  currency: string
  discount: number | null
  imageUrl: string  // 必需字段，不允许null
  dealUrl: string
  merchant: string
  canonicalMerchantName?: string  // 规范化商家名（可选）
  merchantLink?: string
  category: string
  categories?: string[]  // 多分类支持（向后兼容）
  source: string
  guid: string
  publishedAt: Date | null
  expiresAt: Date | null  // 统一为Date | null（符合date-fns要求）
  createdAt: Date
  updatedAt: Date

  // Content
  content: string
  contentHtml: string
  translatedContentHtml: string

  // Extended fields
  wordpressId?: number
  merchantName?: string
  merchantLogo?: string | null
  tags: string[]
  featured: boolean
  voucherCode?: string

  // Link tracking
  affiliateUrl?: string
}

/**
 * Content Block类型
 */
export interface ContentBlock {
  type: 'heading' | 'paragraph' | 'list' | 'image' | 'code' | 'blockquote'
  level?: number
  content?: string
  items?: string[]
  src?: string
  alt?: string
  language?: string
}
