/**
 * TypeScript types for Deal entity from database
 */

export interface ContentBlock {
  type: 'paragraph' | 'heading' | 'list' | 'image' | 'blockquote' | 'code'
  content?: string
  level?: number // for headings
  items?: string[] // for lists
  src?: string // for images
  alt?: string // for images
  language?: string // for code blocks
}

export interface Deal {
  // Primary fields
  id: string
  sourceSite: string
  sourcePostId: string | null
  feedId: string | null
  guid: string
  slug: string | null
  contentHash: string | null

  // Content fields
  title: string // 翻译后的标题
  originalTitle: string | null // 德语原标题
  description: string | null // 翻译后的描述
  originalDescription: string | null // 德语原描述
  contentHtml: string | null // 德语 HTML 内容
  contentText: string | null // 德语纯文本内容
  contentBlocks: ContentBlock[] | null

  // Translation status
  translationStatus: 'pending' | 'processing' | 'completed' | 'failed'

  // Pricing fields
  price: number | null
  originalPrice: number | null
  discount: number | null
  currency: string
  priceText: string | null

  // Media fields
  imageUrl: string | null
  images: string[] | null

  // Merchant fields
  merchant: string | null
  merchantLogo: string | null
  merchantLink: string | null
  fallbackLink: string | null

  // Deal metadata
  dealUrl: string | null
  affiliateUrl: string | null
  couponCode: string | null
  dealType: string | null

  // Categories and tags
  categories: string[] | null
  tags: string[] | null

  // Dates
  publishedAt: Date
  expiresAt: Date | null
  lastSeenAt: Date | null
  createdAt: Date
  updatedAt: Date

  // Stats
  duplicateCount: number
  viewsCount: number
  clicksCount: number

  // Additional fields
  sourcePostUrl: string | null
  isExpired: boolean
  isActive: boolean
  isFeatured: boolean
  clicks: number
  views: number
  priceUpdateNote: string | null
  previousPrice: number | null

  // Raw data
  rawPayload: any | null
}

/**
 * Database row representation (snake_case fields)
 */
export interface DealRow {
  id: string
  source_site: string
  source_post_id: string | null
  feed_id: string | null
  guid: string
  slug: string | null
  content_hash: string | null

  title: string // 翻译后的标题
  original_title: string | null // 德语原标题
  description: string | null // 翻译后的描述
  original_description: string | null // 德语原描述
  content_html: string | null // 德语 HTML
  content_text: string | null // 德语纯文本
  content_blocks: any | null

  translation_status: 'pending' | 'processing' | 'completed' | 'failed'

  price: string | null
  original_price: string | null
  discount: string | null
  currency: string
  price_text: string | null

  image_url: string | null
  images: any | null

  merchant: string | null
  merchant_logo: string | null
  merchant_link: string | null
  fallback_link: string | null

  deal_url: string | null
  affiliate_url: string | null
  coupon_code: string | null
  deal_type: string | null

  categories: any | null
  tags: any | null

  published_at: Date
  expires_at: Date | null
  last_seen_at: Date | null
  created_at: Date
  updated_at: Date

  duplicate_count: number
  views_count: number
  clicks_count: number

  source_post_url: string | null
  is_expired: boolean
  is_active: boolean
  is_featured: boolean
  clicks: number
  views: number
  price_update_note: string | null
  previous_price: string | null

  raw_payload: any | null
}

/**
 * Convert database row to Deal object
 */
export function mapRowToDeal(row: DealRow): Deal {
  return {
    id: row.id,
    sourceSite: row.source_site,
    sourcePostId: row.source_post_id,
    feedId: row.feed_id,
    guid: row.guid,
    slug: row.slug,
    contentHash: row.content_hash,

    // Content fields
    title: row.title || '', // 翻译后的标题
    originalTitle: row.original_title, // 德语原标题
    description: row.description, // 翻译后的描述
    originalDescription: row.original_description, // 德语原描述
    contentHtml: row.content_html, // 德语 HTML
    contentText: row.content_text, // 德语纯文本
    contentBlocks: row.content_blocks as ContentBlock[] | null,
    translationStatus: row.translation_status,

    price: row.price ? parseFloat(row.price) : null,
    originalPrice: row.original_price ? parseFloat(row.original_price) : null,
    discount: row.discount ? parseFloat(row.discount) : null,
    currency: row.currency,
    priceText: row.price_text,

    imageUrl: row.image_url,
    images: row.images as string[] | null,

    merchant: row.merchant,
    merchantLogo: row.merchant_logo,
    merchantLink: row.merchant_link,
    fallbackLink: row.fallback_link,

    dealUrl: row.deal_url,
    affiliateUrl: row.affiliate_url,
    couponCode: row.coupon_code,
    dealType: row.deal_type,

    categories: row.categories as string[] | null,
    tags: row.tags as string[] | null,

    publishedAt: new Date(row.published_at),
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),

    duplicateCount: row.duplicate_count,
    viewsCount: row.views_count,
    clicksCount: row.clicks_count,

    sourcePostUrl: row.source_post_url,
    isExpired: row.is_expired,
    isActive: row.is_active,
    isFeatured: row.is_featured,
    clicks: row.clicks,
    views: row.views,
    priceUpdateNote: row.price_update_note,
    previousPrice: row.previous_price ? parseFloat(row.previous_price) : null,

    rawPayload: row.raw_payload,
  }
}
