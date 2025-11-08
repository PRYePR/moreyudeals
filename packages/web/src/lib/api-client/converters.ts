/**
 * API数据转换器
 * 将API返回的数据转换为前端使用的Deal类型
 */

import type { Deal, ApiDeal } from './types'

/**
 * 类型转换辅助函数
 */

/**
 * 将null转换为undefined（TypeScript类型系统更喜欢undefined）
 */
function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null || value === undefined ? undefined : value
}

/**
 * 确保Date类型为Date | null（不包含undefined）
 */
function ensureDateOrNull(value: Date | null | undefined): Date | null {
  return value === undefined ? null : value
}

/**
 * 确保字符串不为undefined
 */
function ensureString(value: string | null | undefined, fallback: string = ''): string {
  return value ?? fallback
}

/**
 * 商家域名映射表（用于生成Google Favicon）
 */
const MERCHANT_DOMAINS: Record<string, string> = {
  'Amazon.at': 'amazon.de',
  'Amazon': 'amazon.de',
  'MediaMarkt': 'mediamarkt.at',
  'Saturn': 'saturn.at',
  'XXXLutz': 'xxxlutz.at',
  'iBOOD': 'ibood.com',
  'Alza': 'alza.at',
  'Spar': 'spar.at',
  'Interspar': 'interspar.at',
  'Hervis': 'hervis.at',
  'Gastroback': 'gastroback.de',
  'Marktguru': 'marktguru.at',
  'we-are.travel': 'we-are.travel',
  'tink': 'tink.de',
  'EMP': 'emp.com',
  'Hunkemöller': 'hunkemoller.at',
  'Lidl Connect': 'lidl.at',
  'Magenta': 'magenta.at',
  'mömax': 'moemax.at',
  'Möbelix': 'moebelix.at',
  'Pagro': 'pagro.at',
  'zalando-lounge': 'zalando-lounge.at',
}

/**
 * 将商家logo转换为Google Favicon URL
 */
function convertMerchantLogo(merchantName?: string, originalLogo?: string): string | undefined {
  if (!merchantName) return originalLogo

  // 如果已经是Google Favicon，直接返回
  if (originalLogo?.includes('google.com/s2/favicons')) {
    return originalLogo
  }

  // 如果有域名映射，使用Google Favicon
  const domain = MERCHANT_DOMAINS[merchantName]
  if (domain) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  }

  // 否则使用原logo或undefined
  return originalLogo
}

/**
 * 将API Deal转换为前端Deal格式
 */
export function convertApiDealToDeal(apiDeal: ApiDeal): Deal {
  return {
    id: apiDeal.id,
    title: apiDeal.title, // 已翻译的标题（中文）
    originalTitle: apiDeal.title_de || apiDeal.title, // 清理后的德语标题
    translatedTitle: apiDeal.title, // 已翻译的标题（中文）
    titleZh: apiDeal.title,  // 向后兼容
    description: apiDeal.description || '', // 已翻译的描述
    translatedDescription: apiDeal.description,
    descriptionZh: apiDeal.description,  // 向后兼容
    price: typeof apiDeal.price === 'string' ? parseFloat(apiDeal.price) : apiDeal.price || null,
    originalPrice: apiDeal.original_price ? (typeof apiDeal.original_price === 'string' ? parseFloat(apiDeal.original_price) : apiDeal.original_price) : null,
    currency: apiDeal.currency,
    discount: apiDeal.discount || null,
    imageUrl: ensureString(apiDeal.image_url, ''),  // 确保不为null/undefined
    dealUrl: apiDeal.merchant_link || apiDeal.fallback_link || apiDeal.deal_url || apiDeal.link || '',
    merchant: apiDeal.canonical_merchant_name || apiDeal.merchant || '',
    canonicalMerchantName: nullToUndefined(apiDeal.canonical_merchant_name),  // 转换null为undefined
    merchantLink: apiDeal.merchant_link,
    category: apiDeal.categories?.[0] || 'General',
    categories: apiDeal.categories || [],
    source: apiDeal.source_site || 'Unknown',
    guid: apiDeal.guid || apiDeal.id,
    publishedAt: apiDeal.published_at ? new Date(apiDeal.published_at) : null,
    expiresAt: ensureDateOrNull(apiDeal.expires_at ? new Date(apiDeal.expires_at) : null),  // 确保为Date | null
    createdAt: new Date(apiDeal.created_at),
    updatedAt: new Date(apiDeal.updated_at),
    content: apiDeal.description || apiDeal.content_html || '',
    contentHtml: apiDeal.content_html || '',
    translatedContentHtml: apiDeal.translated_content_html || '',

    // Extended fields
    wordpressId: apiDeal.source_post_id ? parseInt(apiDeal.source_post_id) : undefined,
    merchantName: apiDeal.canonical_merchant_name || apiDeal.merchant || undefined,
    merchantLogo: convertMerchantLogo(
      apiDeal.canonical_merchant_name || apiDeal.merchant || '',
      apiDeal.merchant_logo || undefined
    ),
    tags: apiDeal.tags || [],
    featured: apiDeal.is_featured || false,
    voucherCode: apiDeal.coupon_code || undefined,

    // Link tracking
    affiliateUrl: apiDeal.affiliate_url || apiDeal.affiliate_link || undefined,
  }
}

/**
 * 批量转换API Deals
 */
export function convertApiDealsToDeals(apiDeals: ApiDeal[]): Deal[] {
  return apiDeals.map(convertApiDealToDeal)
}
