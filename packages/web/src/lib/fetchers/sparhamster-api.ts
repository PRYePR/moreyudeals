import { BaseFetcher } from './base-fetcher'
import { CoreTranslationManager } from '../translation/translation-manager'
import type { Deal, FetcherConfig, FetchResult } from './types'

/**
 * WordPress API 响应接口
 */
interface WordPressPost {
  id: number
  date: string
  date_gmt: string
  modified: string
  link: string
  title: {
    rendered: string
  }
  content: {
    rendered: string
  }
  excerpt: {
    rendered: string
  }
  categories: number[]
  tags: number[]
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string
      alt_text: string
    }>
    'wp:term'?: Array<Array<{
      id: number
      name: string
      slug: string
    }>>
  }
}

/**
 * Sparhamster.at WordPress API Fetcher
 * 使用 WordPress REST API 获取优惠信息
 */
export class SparhamsterApiFetcher extends BaseFetcher {
  private apiBaseUrl = 'https://www.sparhamster.at/wp-json/wp/v2'

  constructor(translationManager: CoreTranslationManager) {
    super(translationManager, 'Sparhamster.at')
  }

  /**
   * 抓取优惠信息
   */
  async fetchDeals(config?: FetcherConfig): Promise<FetchResult> {
    try {
      const limit = config?.limit || 20
      const page = config?.page || 1

      console.log(`🔍 Fetching deals from ${this.sourceName} WordPress API...`)

      // 构建 API URL (_embed=true 会包含图片和分类信息)
      const url = `${this.apiBaseUrl}/posts?per_page=${limit}&page=${page}&_embed=true&orderby=date&order=desc`

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MoreYuDeals/1.0)'
        }
      })

      if (!response.ok) {
        throw new Error(`WordPress API returned ${response.status}: ${response.statusText}`)
      }

      const posts: WordPressPost[] = await response.json()

      console.log(`📦 Fetched ${posts.length} posts from WordPress API`)

      // 转换所有文章为 Deal 对象
      const deals: Deal[] = []
      for (const post of posts) {
        try {
          const deal = await this.parseWordPressPost(post)
          if (deal) {
            deals.push(deal)
          }
        } catch (error) {
          console.error(`❌ Failed to parse post ${post.id}:`, error)
        }
      }

      console.log(`✅ Successfully parsed ${deals.length} deals`)

      return {
        deals,
        total: deals.length,
        source: this.sourceName,
        fetchedAt: new Date(),
        hasMore: posts.length === limit
      }

    } catch (error) {
      console.error(`❌ Error fetching from ${this.sourceName}:`, error)
      return {
        deals: [],
        total: 0,
        source: this.sourceName,
        fetchedAt: new Date(),
        hasMore: false
      }
    }
  }

  /**
   * 将 WordPress 文章转换为 Deal 对象
   */
  private async parseWordPressPost(post: WordPressPost): Promise<Deal | null> {
    if (!post.title?.rendered || !post.link) {
      return null
    }

    const originalTitle = this.cleanHtml(post.title.rendered)
    const originalDescription = this.cleanHtml(post.excerpt.rendered).substring(0, 300)
    const content = post.content.rendered

    // 提取价格信息
    const priceInfo = this.extractPriceInfo(originalTitle, content)

    // 提取图片
    let imageUrl = this.extractImageFromEmbedded(post)
    if (!imageUrl) {
      imageUrl = this.extractImageFromContent(content)
    }
    if (!imageUrl) {
      imageUrl = this.getPlaceholderImage(this.getCategoryNames(post))
    }

    // 获取分类
    const categoryNames = this.getCategoryNames(post)
    const mainCategory = this.mapCategory(categoryNames)

    // 生成过期时间（30天后）
    const publishedAt = new Date(post.date)
    const expiresAt = new Date(publishedAt.getTime() + 30 * 24 * 60 * 60 * 1000)

    // 准备翻译的标题（智能清理版）
    let titleToTranslate = originalTitle

    // 如果成功提取到交易价格文本，则从标题中精确移除
    if (priceInfo.matchedText) {
      console.log(`✨ Removing deal price from title: "${priceInfo.matchedText}"`)
      titleToTranslate = this.cleanTitleFromPriceInfo(originalTitle, priceInfo.matchedText)
      console.log(`📝 Cleaned title: "${titleToTranslate}"`)

      // 特殊处理：对于 "= pro Monat" 这类结构，补充当前价格
      if (titleToTranslate.includes('= pro Monat') && priceInfo.currentPrice) {
        titleToTranslate = titleToTranslate.replace('= pro Monat', `= ${priceInfo.currentPrice} € pro Monat`)
        console.log(`🔧 补充月费价格: "${titleToTranslate}"`)
      }
    } else {
      console.log(`ℹ️  No deal price pattern found in title, keeping original: "${originalTitle}"`)
    }

    // 提取商家链接
    let merchantUrl = this.extractMerchantUrl(content, post.link)
    // 解析跳转链接以获取最终URL
    merchantUrl = await this.resolveRedirectUrl(merchantUrl)

    // 从最终URL提取商家信息
    const merchantName = this.extractMerchantNameFromUrl(merchantUrl)
    const merchantLogo = this.getMerchantLogoUrl(merchantUrl)

    // 翻译标题和描述
    const translatedTitle = await this.translateText(titleToTranslate, 'de', 'zh')
    const translatedDescription = await this.translateText(originalDescription, 'de', 'zh')

    // 获取翻译后的分类
    const translatedCategory = this.translateCategory(mainCategory)

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
      dealUrl: merchantUrl,
      category: translatedCategory,
      source: this.sourceName,
      publishedAt,
      expiresAt,
      language: 'de',
      translationProvider: 'deepl',
      isTranslated: true,
      categories: categoryNames,
      content: this.cleanHtml(content),
      wordpressId: post.id,
      merchantName,
      merchantLogo
    }
  }

  /**
   * 从 _embedded 中提取图片
   */
  private extractImageFromEmbedded(post: WordPressPost): string | null {
    const media = post._embedded?.['wp:featuredmedia']
    if (media && media.length > 0 && media[0].source_url) {
      return media[0].source_url
    }
    return null
  }

  /**
   * 从 content HTML 中提取图片
   */
  private extractImageFromContent(content: string): string | null {
    const imgMatches = [
      /<img[^>]+src=["']([^"']+)["'][^>]*>/i,
      /wp-content\/uploads\/[^"'\s]+\.(jpg|jpeg|png|gif|webp)/i,
      /https:\/\/[^"'\s]*amazon[^"'\s]*\.(jpg|jpeg|png|gif|webp)/i
    ]

    for (const pattern of imgMatches) {
      const match = content.match(pattern)
      if (match) {
        return match[1] || match[0]
      }
    }

    return null
  }

  /**
   * 获取分类名称
   */
  private getCategoryNames(post: WordPressPost): string[] {
    const terms = post._embedded?.['wp:term']
    if (!terms || terms.length === 0) return []

    // WordPress API 的 _embedded['wp:term'] 是一个二维数组
    // 第一个数组是分类(categories)，第二个是标签(tags)
    const categories = terms[0] || []
    return categories.map(term => term.name)
  }

  /**
   * 映射分类到标准分类
   */
  private mapCategory(categories: string[]): string {
    if (!categories || categories.length === 0) return 'General'

    const categoryMapping: Record<string, string> = {
      'elektronik': 'Electronics',
      'amazon': 'Electronics',
      'fashion': 'Fashion',
      'fashion & beauty': 'Fashion & Beauty',
      'kleidung': 'Fashion',
      'gaming': 'Gaming',
      'spiele': 'Gaming',
      'haushalt': 'Home & Kitchen',
      'küche': 'Home & Kitchen',
      'beauty': 'Beauty & Health',
      'sport': 'Sports & Outdoor',
      'auto': 'Automotive',
      'bücher': 'Books',
      'musik': 'Music & Movies',
      'entertainment': 'Entertainment'
    }

    for (const category of categories) {
      // 解码 HTML 实体并清理
      const cleanCategory = this.decodeHtmlEntities(category).toLowerCase()
      if (categoryMapping[cleanCategory]) {
        return categoryMapping[cleanCategory]
      }
    }

    return categories[0] || 'General'
  }

  /**
   * 解码 HTML 实体
   */
  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#039;': "'",
      '&#8217;': "'",
      '&#8220;': '"',
      '&#8221;': '"',
      '&#8211;': '–',
      '&#8212;': '—',
    }

    return text.replace(/&[^;]+;/g, match => entities[match] || match)
  }

  /**
   * 从标题中移除指定的价格文本（精确移除版）
   * @param title 原始标题
   * @param priceTextToRemove 要移除的价格文本片段
   */
  private cleanTitleFromPriceInfo(title: string, priceTextToRemove: string): string {
    if (!priceTextToRemove) {
      return title
    }

    let cleanTitle = title

    // 精确移除匹配到的价格文本
    // 同时移除前后可能的连接词（um, für, 等）
    const patterns = [
      // "um X € statt Y €" 格式
      new RegExp(`\\s+um\\s+${this.escapeRegex(priceTextToRemove)}`, 'gi'),
      // "für X € statt Y €" 格式
      new RegExp(`\\s+für\\s+${this.escapeRegex(priceTextToRemove)}`, 'gi'),
      // 直接的价格文本
      new RegExp(`\\s+${this.escapeRegex(priceTextToRemove)}`, 'gi'),
      // "= X € statt Y €" 格式（常见于年票类）
      new RegExp(`\\s*=\\s*${this.escapeRegex(priceTextToRemove)}[^a-zA-Z0-9äöüÄÖÜß]*$`, 'gi'),
    ]

    for (const pattern of patterns) {
      const before = cleanTitle
      cleanTitle = cleanTitle.replace(pattern, '')
      if (before !== cleanTitle) {
        break // 成功移除后就停止
      }
    }

    // 清理多余的空格和标点
    cleanTitle = cleanTitle
      .replace(/\s+/g, ' ')
      .replace(/[–-]\s*$/, '')
      .replace(/\s*=\s*$/, '')
      .trim()

    return cleanTitle
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * 提取价格信息（优化版）
   * 返回提取到的价格以及匹配到的原始文本片段
   */
  private extractPriceInfo(title: string, content: string): {
    currentPrice?: string
    originalPrice?: string
    discountPercentage?: number
    matchedText?: string
  } {
    const text = title + ' ' + content

    // 定义明确的交易价格格式（包含"对比价格"的格式）
    const dealPricePatterns = [
      // "X € statt Y €" 格式
      /(\d+(?:[.,]\d+)?)\s*€\s*statt\s*(\d+(?:[.,]\d+)?)\s*€/i,
      // "von X € auf Y €" 格式
      /von\s*(\d+(?:[.,]\d+)?)\s*€\s*auf\s*(\d+(?:[.,]\d+)?)\s*€/i,
      // "ursprünglich X €, jetzt Y €" 格式
      /ursprünglich\s*(\d+(?:[.,]\d+)?)\s*€.*?jetzt\s*(\d+(?:[.,]\d+)?)\s*€/i,
      // "UVP: X €, Preis: Y €" 格式
      /UVP:?\s*(\d+(?:[.,]\d+)?)\s*€.*?Preis:?\s*(\d+(?:[.,]\d+)?)\s*€/i
    ]

    // 优先在标题中查找交易价格
    for (const pattern of dealPricePatterns) {
      const match = title.match(pattern)
      if (match) {
        const price1 = parseFloat(match[1].replace(',', '.'))
        const price2 = parseFloat(match[2].replace(',', '.'))

        // 确定哪个是现价，哪个是原价
        let currentPrice: number
        let originalPrice: number

        if (price1 < price2) {
          currentPrice = price1
          originalPrice = price2
        } else {
          currentPrice = price2
          originalPrice = price1
        }

        const discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100)

        return {
          currentPrice: currentPrice.toFixed(2),
          originalPrice: originalPrice.toFixed(2),
          discountPercentage,
          matchedText: match[0] // 返回匹配到的完整文本
        }
      }
    }

    // 如果标题中没找到，再去内容中找
    for (const pattern of dealPricePatterns) {
      const match = content.match(pattern)
      if (match) {
        const price1 = parseFloat(match[1].replace(',', '.'))
        const price2 = parseFloat(match[2].replace(',', '.'))

        let currentPrice: number
        let originalPrice: number

        if (price1 < price2) {
          currentPrice = price1
          originalPrice = price2
        } else {
          currentPrice = price2
          originalPrice = price1
        }

        const discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100)

        return {
          currentPrice: currentPrice.toFixed(2),
          originalPrice: originalPrice.toFixed(2),
          discountPercentage,
          matchedText: undefined // 内容中找到的不返回 matchedText（不从标题删除）
        }
      }
    }

    // 如果没有找到明确的交易价格，尝试提取单个价格（但不返回 matchedText）
    const singlePriceMatch = text.match(/(\d+(?:[.,]\d+)?)\s*€/)
    if (singlePriceMatch) {
      return {
        currentPrice: parseFloat(singlePriceMatch[1].replace(',', '.')).toFixed(2),
        matchedText: undefined // 单个价格不应该从标题中删除
      }
    }

    return {}
  }

  /**
   * 从内容中提取商家名称
   */
  private extractMerchantName(content: string): string | undefined {
    // 常见商家模式
    const merchantPatterns = [
      // "Bei Amazon gibt es..."
      /[Bb]ei\s+<strong>([^<]+)<\/strong>/,
      /[Bb]ei\s+([A-Za-zäöüÄÖÜß0-9&\s.]+?)(?:\s+gibt|\s+gibts|\s+bekommt)/,
      // "Im XXXLutz Onlineshop..."
      /[Ii]m\s+<strong>([^<]+)<\/strong>/,
      /[Ii]m\s+([A-Za-zäöüÄÖÜß0-9&\s.]+?)(?:\s+Onlineshop|\s+gibt)/,
      // "Amazon:" or "MediaMarkt:"
      /^<strong>([A-Za-zäöüÄÖÜß0-9&\s.]+)<\/strong>\s*:/,
      // 从链接中提取（如果包含商家域名）
      /https?:\/\/(?:www\.)?([a-z0-9-]+)\./i
    ]

    for (const pattern of merchantPatterns) {
      const match = content.match(pattern)
      if (match && match[1]) {
        let merchant = match[1].trim()

        // 清理常见后缀
        merchant = merchant
          .replace(/\s+(gibts|gibt|bekommt|Onlineshop).*$/i, '')
          .trim()

        // 只返回合理长度的商家名（2-30个字符）
        if (merchant.length >= 2 && merchant.length <= 30) {
          // 标准化常见商家名
          return this.normalizeMerchantName(merchant)
        }
      }
    }

    return undefined
  }

  /**
   * 标准化商家名称
   */
  private normalizeMerchantName(merchant: string): string {
    const normalizations: Record<string, string> = {
      'amazon': 'Amazon',
      'amazon.de': 'Amazon',
      'mediamarkt': 'MediaMarkt',
      'saturn': 'Saturn',
      'xxxlutz': 'XXXLutz',
      'ikea': 'IKEA',
      'hofer': 'Hofer',
      'lidl': 'Lidl',
      'billa': 'Billa',
      'spar': 'Spar',
      'mueller': 'Müller',
      'dm': 'dm',
      'thalia': 'Thalia',
      'hervis': 'Hervis',
      'interspar': 'Interspar',
      'geizhals': 'Geizhals'
    }

    const lowerMerchant = merchant.toLowerCase()
    return normalizations[lowerMerchant] || merchant
  }

  /**
   * 从最终URL中提取商家名称
   */
  private extractMerchantNameFromUrl(url: string): string | undefined {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname

      // 移除 www. 前缀
      const domain = hostname.replace(/^www\./, '')

      // 提取主域名（去除国家后缀）
      const domainParts = domain.split('.')
      if (domainParts.length >= 2) {
        // 取第一部分作为商家名
        const merchantKey = domainParts[0]

        // 使用标准化方法
        return this.normalizeMerchantName(merchantKey)
      }

      return undefined
    } catch (error) {
      console.error('Error extracting merchant name from URL:', url, error)
      return undefined
    }
  }

  /**
   * 从最终URL生成商家Logo URL
   */
  private getMerchantLogoUrl(url: string): string | undefined {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname

      // 使用 Google Favicon 服务获取商家 Logo
      // 这是一个免费且稳定的服务
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
    } catch (error) {
      console.error('Error generating merchant logo URL:', url, error)
      return undefined
    }
  }

  /**
   * 翻译分类到中文
   */
  private translateCategory(category: string): string {
    const categoryTranslations: Record<string, string> = {
      'Electronics': '电子产品',
      'Fashion': '时尚服饰',
      'Fashion & Beauty': '时尚美妆',
      'Gaming': '游戏娱乐',
      'Home & Kitchen': '家居厨房',
      'Beauty & Health': '美妆健康',
      'Sports & Outdoor': '运动户外',
      'Automotive': '汽车用品',
      'Books': '图书音像',
      'Music & Movies': '音乐影视',
      'Entertainment': '娱乐休闲',
      'Food & Beverage': '食品饮料',
      'Toys & Baby': '玩具母婴',
      'General': '综合'
    }

    return categoryTranslations[category] || category
  }
}