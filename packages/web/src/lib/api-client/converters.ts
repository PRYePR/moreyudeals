/**
 * API数据转换器
 * 将API返回的数据转换为前端使用的Deal类型
 */

import type { Deal } from '../fetchers/types'
import type { ApiDeal } from './types'

/**
 * 将API Deal转换为前端Deal格式
 */
export function convertApiDealToDeal(apiDeal: ApiDeal): Deal {
  return {
    id: apiDeal.id,
    title: apiDeal.title, // 已翻译的标题（中文）
    originalTitle: apiDeal.title_de || apiDeal.title, // 清理后的德语标题
    translatedTitle: apiDeal.title, // 已翻译的标题（中文）
    description: apiDeal.description || '', // 已翻译的描述
    price: apiDeal.price?.toString() || undefined,
    originalPrice: apiDeal.original_price?.toString() || undefined,
    currency: apiDeal.currency,
    discountPercentage: apiDeal.discount || undefined,
    imageUrl: apiDeal.image_url || '',
    dealUrl: apiDeal.merchant_link || apiDeal.fallback_link || apiDeal.deal_url || '',
    category: apiDeal.categories?.[0] || 'General',
    source: apiDeal.source_site,
    publishedAt: new Date(apiDeal.published_at),
    expiresAt: apiDeal.expires_at ? new Date(apiDeal.expires_at) : undefined,
    language: 'de' as const,
    translationProvider: 'deepl' as const,
    isTranslated: apiDeal.translation_status === 'completed',
    categories: apiDeal.categories || [],
    content: apiDeal.description || apiDeal.content_html || '',
    contentHtml: apiDeal.content_html || '',
    translatedContentHtml: apiDeal.translated_content_html || '',

    // Extended fields
    wordpressId: apiDeal.source_post_id ? parseInt(apiDeal.source_post_id) : undefined,
    merchantName: apiDeal.canonical_merchant_name || apiDeal.merchant || undefined,
    merchantLogo: apiDeal.merchant_logo || undefined,
    tags: apiDeal.tags || [],
    featured: apiDeal.is_featured,
    voucherCode: apiDeal.coupon_code || undefined,

    // Link tracking
    affiliateUrl: apiDeal.affiliate_url || undefined,
  }
}

/**
 * 批量转换API Deals
 */
export function convertApiDealsToDeals(apiDeals: ApiDeal[]): Deal[] {
  return apiDeals.map(convertApiDealToDeal)
}
