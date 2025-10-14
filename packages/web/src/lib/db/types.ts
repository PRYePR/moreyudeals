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

  // Content fields (original language)
  title: string
  description: string | null
  contentHtml: string | null
  contentBlocks: ContentBlock[] | null

  // Translation fields
  titleZh: string | null
  titleEn: string | null
  descriptionZh: string | null
  descriptionEn: string | null
  contentHtmlZh: string | null
  contentHtmlEn: string | null
  contentBlocksZh: ContentBlock[] | null
  contentBlocksEn: ContentBlock[] | null
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

  title: string
  description: string | null
  content_html: string | null
  content_blocks: any | null

  title_zh: string | null
  title_en: string | null
  description_zh: string | null
  description_en: string | null
  content_html_zh: string | null
  content_html_en: string | null
  content_blocks_zh: any | null
  content_blocks_en: any | null
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

    title: row.title,
    description: row.description,
    contentHtml: row.content_html,
    contentBlocks: row.content_blocks as ContentBlock[] | null,

    titleZh: row.title_zh,
    titleEn: row.title_en,
    descriptionZh: row.description_zh,
    descriptionEn: row.description_en,
    contentHtmlZh: row.content_html_zh,
    contentHtmlEn: row.content_html_en,
    contentBlocksZh: row.content_blocks_zh as ContentBlock[] | null,
    contentBlocksEn: row.content_blocks_en as ContentBlock[] | null,
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

    rawPayload: row.raw_payload,
  }
}
