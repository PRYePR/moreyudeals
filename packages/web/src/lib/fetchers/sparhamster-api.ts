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

    // 从 tags 中提取商家信息（这是 sparhamster.at 的正确方法）
    const merchantInfo = this.extractMerchantFromTags(post)
    const merchantName = merchantInfo.name
    const merchantLogo = merchantInfo.logo

    // 提取商家链接（作为 dealUrl）
    // 直接使用 forward 链接，不进行解析（性能优化）
    // 用户点击时由浏览器处理跳转
    let merchantUrl = this.extractMerchantUrl(content, post.link)

    // 如果没有找到有效的商家链接，且我们有商家信息，则使用商家主页
    if (merchantUrl === post.link && merchantInfo.homepageUrl) {
      console.log(`ℹ️  No merchant link found, using homepage: ${merchantInfo.homepageUrl}`)
      merchantUrl = merchantInfo.homepageUrl
    }

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
   * 从文章的 tags 中提取商家信息
   * sparhamster.at 使用 tags 来标记商家（如 "Amazon", "MediaMarkt" 等）
   */
  private extractMerchantFromTags(post: WordPressPost): { name?: string, logo?: string, homepageUrl?: string } {
    const embedded = post._embedded
    if (!embedded || !embedded['wp:term']) {
      return {}
    }

    // wp:term[1] 是 tags (wp:term[0] 是 categories)
    const tags = embedded['wp:term'][1] || []

    // 已知商家 tags 的映射（基于 sparhamster.at 的实际 tags）
    const merchantTagPatterns: Record<string, { name: string, domain: string, homepage: string }> = {
      'amazon-de': { name: 'Amazon', domain: 'amazon.de', homepage: 'https://www.amazon.de' },
      'amazon-co-uk': { name: 'Amazon UK', domain: 'amazon.co.uk', homepage: 'https://www.amazon.co.uk' },
      'amazon-it': { name: 'Amazon IT', domain: 'amazon.it', homepage: 'https://www.amazon.it' },
      'amazon-fr': { name: 'Amazon FR', domain: 'amazon.fr', homepage: 'https://www.amazon.fr' },
      'amazon-es': { name: 'Amazon ES', domain: 'amazon.es', homepage: 'https://www.amazon.es' },
      'amazon-com': { name: 'Amazon US', domain: 'amazon.com', homepage: 'https://www.amazon.com' },
      'media-markt': { name: 'MediaMarkt', domain: 'mediamarkt.at', homepage: 'https://www.mediamarkt.at' },
      'media-markt-at': { name: 'MediaMarkt', domain: 'mediamarkt.at', homepage: 'https://www.mediamarkt.at' },
      'saturn': { name: 'Saturn', domain: 'saturn.at', homepage: 'https://www.saturn.at' },
      'saturn-at': { name: 'Saturn', domain: 'saturn.at', homepage: 'https://www.saturn.at' },
      'hofer': { name: 'Hofer', domain: 'hofer.at', homepage: 'https://www.hofer.at' },
      'lidl': { name: 'Lidl', domain: 'lidl.at', homepage: 'https://www.lidl.at' },
      'billa': { name: 'BILLA', domain: 'billa.at', homepage: 'https://www.billa.at' },
      'spar': { name: 'SPAR', domain: 'spar.at', homepage: 'https://www.spar.at' },
      'mueller': { name: 'Müller', domain: 'mueller.at', homepage: 'https://www.mueller.at' },
      'dm': { name: 'dm', domain: 'dm.at', homepage: 'https://www.dm.at' },
      'thalia': { name: 'Thalia', domain: 'thalia.at', homepage: 'https://www.thalia.at' },
      'xxxlutz': { name: 'XXXLutz', domain: 'xxxlutz.at', homepage: 'https://www.xxxlutz.at' },
      'xxxlutz-at': { name: 'XXXLutz', domain: 'xxxlutz.at', homepage: 'https://www.xxxlutz.at' },
      'ikea': { name: 'IKEA', domain: 'ikea.com', homepage: 'https://www.ikea.com/at' },
      'otto-at': { name: 'OTTO', domain: 'otto.at', homepage: 'https://www.otto.at' },
      'universal-at': { name: 'Universal', domain: 'universal.at', homepage: 'https://www.universal.at' },
      'interspar': { name: 'Interspar', domain: 'interspar.at', homepage: 'https://www.interspar.at' },
      'about-you-at': { name: 'About You', domain: 'aboutyou.at', homepage: 'https://www.aboutyou.at' },
      'zalando': { name: 'Zalando', domain: 'zalando.at', homepage: 'https://www.zalando.at' },
      'hervis': { name: 'Hervis', domain: 'hervis.at', homepage: 'https://www.hervis.at' },
      'sportsdirect': { name: 'Sports Direct', domain: 'sportsdirect.com', homepage: 'https://at.sportsdirect.com' },
      'notebooksbilliger-at': { name: 'notebooksbilliger.at', domain: 'notebooksbilliger.at', homepage: 'https://www.notebooksbilliger.at' },
      'cyberport-at': { name: 'Cyberport', domain: 'cyberport.at', homepage: 'https://www.cyberport.at' },
      'conrad-at': { name: 'Conrad', domain: 'conrad.at', homepage: 'https://www.conrad.at' },
      'alternate-at': { name: 'Alternate', domain: 'alternate.at', homepage: 'https://www.alternate.at' },
      'emp': { name: 'EMP', domain: 'emp.de', homepage: 'https://www.emp.de' },
      'crocs': { name: 'Crocs', domain: 'crocs.at', homepage: 'https://www.crocs.at' },
      'lottoland': { name: 'Lottoland', domain: 'lottoland.com', homepage: 'https://www.lottoland.at' },
      'deichmann': { name: 'Deichmann', domain: 'deichmann.com', homepage: 'https://www.deichmann.com/at' },
      'h-m': { name: 'H&M', domain: 'hm.com', homepage: 'https://www2.hm.com/de_at' },
      'zara': { name: 'Zara', domain: 'zara.com', homepage: 'https://www.zara.com/at' },
      'libro': { name: 'Libro', domain: 'libro.at', homepage: 'https://www.libro.at' },
      'obi': { name: 'OBI', domain: 'obi.at', homepage: 'https://www.obi.at' },
      'bauhaus': { name: 'Bauhaus', domain: 'bauhaus.at', homepage: 'https://www.bauhaus.at' },
    }

    // 查找第一个匹配的商家 tag
    for (const tag of tags) {
      const slug = tag.slug.toLowerCase()
      const merchantInfo = merchantTagPatterns[slug]

      if (merchantInfo) {
        console.log(`✅ Found merchant from tag: ${tag.name} (slug: ${slug})`)
        return {
          name: merchantInfo.name,
          logo: `https://www.google.com/s2/favicons?domain=${merchantInfo.domain}&sz=64`,
          homepageUrl: merchantInfo.homepage
        }
      }

      // 如果tag名称本身看起来像商家（首字母大写且不是通用词汇）
      const tagName = tag.name
      if (tagName && tagName[0] === tagName[0].toUpperCase() && tagName.length > 2) {
        // 排除明显不是商家的 tags（如 "Black Friday", "Sale" 等）
        const excludePatterns = ['black', 'friday', 'sale', 'deal', 'rabatt', 'aktion', 'gewinnspiel']
        if (!excludePatterns.some(pattern => tagName.toLowerCase().includes(pattern))) {
          console.log(`ℹ️  Using capitalized tag as potential merchant: ${tagName}`)
          // 尝试从 tag slug 生成 domain (如 "Deichmann" -> "deichmann.com")
          const possibleDomain = `${slug}.com`
          return {
            name: tagName,
            logo: `https://www.google.com/s2/favicons?domain=${possibleDomain}&sz=64`
          }
        }
      }
    }

    console.log(`⚠️  No merchant tag found for post ${post.id}`)
    return {}
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