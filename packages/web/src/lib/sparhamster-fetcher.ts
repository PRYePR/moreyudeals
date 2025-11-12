import { CoreTranslationManager } from '../../../translation'
import {
  merchantParser,
  priceParser,
  imageParser,
  textCleaner
} from './scrapers'
import { defaultCache, cacheKeys, CACHE_TTL } from './cache'
import { createModuleLogger } from './logger'

const logger = createModuleLogger('sparhamster-fetcher')

export interface SparhamsterDeal {
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
  translationProvider: 'deepl' | 'microsoft' | 'microsoft2' | 'google'
  isTranslated: boolean
  categories: string[]
  content: string
  merchantName?: string
  merchantLogo?: string
}

interface WordPressPost {
  id: number
  date: string
  title: {
    rendered: string
  }
  content: {
    rendered: string
  }
  excerpt: {
    rendered: string
  }
  link: string
  categories: number[]
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string
    }>
    'wp:term'?: Array<Array<{
      id: number
      name: string
      slug: string
    }>>
  }
}

export class SparhamsterFetcher {
  private apiUrl = 'https://www.sparhamster.at/wp-json/wp/v2/posts?per_page=20&_embed=true'
  private translationManager: CoreTranslationManager

  constructor(translationManager: CoreTranslationManager) {
    this.translationManager = translationManager
  }

  async fetchLatestDeals(): Promise<SparhamsterDeal[]> {
    const cacheKey = cacheKeys.allDeals()

    try {
      // 尝试从缓存获取
      const cached = await defaultCache.get<SparhamsterDeal[]>(cacheKey)
      if (cached) {
        logger.info('Loaded deals from cache', { count: cached.length })
        return cached
      }

      logger.info('Fetching deals from WordPress API')
      const response = await fetch(this.apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const posts: WordPressPost[] = await response.json()
      logger.debug('Fetched posts from WordPress API', { count: posts.length })

      const deals: SparhamsterDeal[] = []

      for (const post of posts) {
        const deal = await this.parsePostItem(post)
        if (deal) {
          deals.push(deal)
        }
      }

      logger.info('Successfully parsed deals', { count: deals.length })

      // 缓存结果（10分钟）
      await defaultCache.set(cacheKey, deals, CACHE_TTL.DEALS_LIST)

      return deals
    } catch (error) {
      logger.error('Error fetching Sparhamster deals', error as Error)
      return []
    }
  }

  private async parsePostItem(post: WordPressPost): Promise<SparhamsterDeal | null> {
    if (!post.title?.rendered || !post.link) {
      return null
    }

    const originalTitle = post.title.rendered
    const originalDescription = textCleaner.cleanDescription(post.excerpt.rendered || '')
    const content = post.content.rendered || ''

    // 提取价格信息
    const priceInfo = priceParser.extractPriceInfo(originalTitle, content)

    // 提取图片 - 优先使用 WordPress 特色图片
    let imageUrl = this.extractFeaturedImage(post)
    if (!imageUrl) {
      imageUrl = imageParser.extractImageUrl(content)
    }
    if (!imageUrl && post.link) {
      imageUrl = await imageParser.extractImageFromDealPage(post.link)
    }

    // 提取分类名称
    const categoryNames = this.extractCategoryNames(post)

    if (!imageUrl) {
      imageUrl = imageParser.getPlaceholderImage(categoryNames)
    }

    // 生成过期时间（设为30天后）
    const publishedAt = new Date(post.date)
    const expiresAt = new Date(publishedAt.getTime() + 30 * 24 * 60 * 60 * 1000)

    // 清理标题中的价格信息（如果需要）
    let titleToTranslate = originalTitle
    if (priceParser.hasPriceInTitle(originalTitle)) {
      logger.debug('Removing deal price from title', { originalTitle })
      titleToTranslate = priceParser.cleanPriceFromTitle(originalTitle)
      logger.debug('Cleaned title', { cleanedTitle: titleToTranslate })
    } else {
      logger.debug('No deal price pattern found in title, keeping original', { originalTitle })
    }

    // 翻译标题和描述
    const [translationResult, descriptionResult] = await Promise.all([
      this.translationManager.translate({ text: titleToTranslate, from: 'de', to: 'zh' }),
      this.translationManager.translate({ text: originalDescription, from: 'de', to: 'zh' })
    ])

    const translatedTitle = translationResult.translatedText
    const translatedDescription = descriptionResult.translatedText
    const translationProvider = translationResult.provider

    // 提取商家信息
    const merchantInfo = this.extractMerchantInfo(content, post.link, categoryNames)

    return {
      id: this.generateId(post.link),
      title: translatedTitle,
      originalTitle,
      translatedTitle,
      description: translatedDescription,
      originalDescription,
      translatedDescription,
      price: priceInfo.currentPrice,
      originalPrice: priceInfo.originalPrice,
      currency: 'EUR',
      discountPercentage: priceInfo.discountPercentage,
      imageUrl,
      dealUrl: merchantInfo.merchantUrl,
      category: this.mapCategory(categoryNames),
      source: 'Sparhamster.at',
      publishedAt,
      expiresAt,
      language: 'de',
      translationProvider: translationProvider,
      isTranslated: true,
      categories: categoryNames,
      content: textCleaner.cleanHtml(content),
      merchantName: merchantInfo.merchantName,
      merchantLogo: merchantInfo.merchantLogo
    }
  }

  private extractFeaturedImage(post: WordPressPost): string | null {
    if (post._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
      return post._embedded['wp:featuredmedia'][0].source_url
    }
    return null
  }

  private extractCategoryNames(post: WordPressPost): string[] {
    const categories: string[] = []

    if (post._embedded?.['wp:term']?.[0]) {
      for (const term of post._embedded['wp:term'][0]) {
        if (term.name) {
          categories.push(term.name)
        }
      }
    }

    return categories
  }

  /**
   * 提取商家信息（使用新的 merchantParser）
   */
  private extractMerchantInfo(
    content: string,
    fallbackUrl: string,
    categories: string[]
  ): { merchantUrl: string; merchantName?: string; merchantLogo?: string } {
    // 首先尝试从标签中识别已知商家
    const knownMerchant = merchantParser.matchKnownMerchant(categories)
    if (knownMerchant) {
      logger.debug('Found merchant from tag', {
        merchantName: knownMerchant.name,
        slug: knownMerchant.slug
      })
    }

    // 尝试从首字母大写的标签中提取商家名
    const potentialMerchant = merchantParser.extractMerchantFromTags(categories)
    if (potentialMerchant && !knownMerchant) {
      logger.debug('Using capitalized tag as potential merchant', {
        merchantName: potentialMerchant
      })
    }

    // 从内容中提取商家链接
    const result = merchantParser.extractMerchantInfo(content, fallbackUrl)

    // 如果没有找到商家链接，使用已知商家的主页
    if (result.merchantUrl === fallbackUrl && knownMerchant) {
      const homepage = this.getMerchantHomepage(knownMerchant.slug)
      logger.debug('No merchant link found, using homepage', { homepage })
      return {
        merchantUrl: homepage,
        merchantName: knownMerchant.name,
        merchantLogo: result.merchantLogo
      }
    }

    return {
      ...result,
      merchantName: result.merchantName || knownMerchant?.name || potentialMerchant
    }
  }

  /**
   * 获取已知商家的主页
   */
  private getMerchantHomepage(slug: string): string {
    const homepages: Record<string, string> = {
      'amazon-de': 'https://www.amazon.de',
      'mediamarkt': 'https://www.mediamarkt.de',
      'saturn': 'https://www.saturn.de',
      'conrad': 'https://www.conrad.de',
      'notebooksbilliger': 'https://www.notebooksbilliger.de',
      'alternate': 'https://www.alternate.de',
    }

    return homepages[slug] || 'https://www.amazon.de'
  }

  private mapCategory(categories?: string[]): string {
    if (!categories || categories.length === 0) return 'Other'

    // 11个标准分类，与 category-mapping.ts 保持一致
    const categoryMapping: Record<string, string> = {
      'elektronik': 'Electronics',
      'computer': 'Electronics',
      'haushaltsgeräte': 'Appliances',
      'haushalt': 'Home',
      'wohnen': 'Home',
      'küche': 'Home',
      'fashion': 'Fashion',
      'kleidung': 'Fashion',
      'mode': 'Fashion',
      'beauty': 'Beauty',
      'gesundheit': 'Beauty',
      'lebensmittel': 'Food',
      'sport': 'Sports',
      'freizeit': 'Sports',
      'familie': 'Family & Kids',
      'spielzeug': 'Family & Kids',
      'kinder': 'Family & Kids',
      'auto': 'Auto',
      'motorrad': 'Auto',
      'kfz': 'Auto',
      'gaming': 'Entertainment',
      'entertainment': 'Entertainment',
      'spiele': 'Entertainment',
      'unterhaltung': 'Entertainment',
      'bücher': 'Other',
      'musik': 'Other',
      'amazon': 'Other',
    }

    for (const category of categories) {
      const key = category.toLowerCase()
      if (categoryMapping[key]) {
        return categoryMapping[key]
      }
    }

    return categories[0] || 'General'
  }

  private generateId(url: string): string {
    const urlPath = url.split('/').pop()?.replace(/[^a-zA-Z0-9-]/g, '') || ''

    if (urlPath && urlPath.length >= 6) {
      return urlPath.toLowerCase()
    }

    return this.hashString(url)
  }

  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }

    const positive = Math.abs(hash)
    return positive.toString(36).padStart(9, '0').substring(0, 9)
  }
}
