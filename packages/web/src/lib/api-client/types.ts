/**
 * API客户端类型定义
 * 与后端API服务器的接口保持一致
 */

export interface ApiDeal {
  id: string
  title: string
  title_de?: string
  description?: string
  price?: number
  original_price?: number
  currency: string
  discount?: number
  image_url?: string
  deal_url?: string
  merchant_link?: string
  fallback_link?: string
  affiliate_url?: string
  merchant?: string
  canonical_merchant_name?: string
  merchant_logo?: string
  categories?: string[]
  tags?: string[]
  source_site: string
  source_post_id?: string
  published_at: string
  expires_at?: string
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
  merchants: Array<{
    merchant: string
    deal_count: number
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
