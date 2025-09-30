import Parser from 'rss-parser'
import { CoreTranslationManager } from '../../../translation'

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
  translationProvider: 'deepl' | 'microsoft' | 'google'
  isTranslated: boolean
  categories: string[]
  content: string
}

interface RSSItem {
  title?: string
  link?: string
  pubDate?: string
  'content:encoded'?: string
  description?: string
  categories?: string[]
  guid?: string
}

export class SparhamsterFetcher {
  private parser: Parser<any, RSSItem>
  private rssUrl = 'https://www.sparhamster.at/feed/'
  private translationManager: CoreTranslationManager

  constructor(translationManager: CoreTranslationManager) {
    this.parser = new Parser({
      customFields: { item: ['content:encoded', ['media:content', 'media']] }
    })
    this.translationManager = translationManager
  }

  async fetchLatestDeals(): Promise<SparhamsterDeal[]> {
    try {
      const feed = await this.parser.parseURL(this.rssUrl)
      const deals: SparhamsterDeal[] = []

      for (const item of feed.items.slice(0, 20)) { // 限制20个最新优惠
        const deal = await this.parseRSSItem(item)
        if (deal) {
          deals.push(deal)
        }
      }

      return deals
    } catch (error) {
      console.error('Error fetching Sparhamster deals:', error)
      return []
    }
  }

  private async parseRSSItem(item: RSSItem): Promise<SparhamsterDeal | null> {
    if (!item.title || !item.link) {
      return null
    }

    const originalTitle = item.title
    const originalDescription = this.cleanDescription(item.description || '')
    const content = item['content:encoded'] || item.description || ''

    // 提取价格信息
    const priceInfo = this.extractPriceInfo(originalTitle, content)

    // 提取图片 - 先尝试从内容中提取，如果没有则从dealUrl页面抓取
    let imageUrl = this.extractImageUrl(content)
    if (!imageUrl && item.link) {
      imageUrl = await this.extractImageFromDealPage(item.link)
    }
    if (!imageUrl) {
      imageUrl = this.getPlaceholderImage(item.categories)
    }

    // 生成过期时间（RSS中通常没有，我们设为30天后）
    const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date()
    const expiresAt = new Date(publishedAt.getTime() + 30 * 24 * 60 * 60 * 1000)

    let titleToTranslate = originalTitle

    // 仅当标题包含 "X statt Y" 这种明确的折扣格式时，才清洗标题
    if (this.hasPriceInTitle(originalTitle)) {
      console.log(`✨ Cleaning price from title: "${originalTitle}"`)
      titleToTranslate = this.cleanTitleFromPriceInfo(originalTitle)
    }

    // 翻译标题和描述
    const [translationResult, descriptionResult] = await Promise.all([
      this.translationManager.translate({ text: titleToTranslate, from: 'de', to: 'zh' }),
      this.translationManager.translate({ text: originalDescription, from: 'de', to: 'zh' })
    ])

    const translatedTitle = translationResult.translatedText
    const translatedDescription = descriptionResult.translatedText
    // 使用第一个翻译结果的 provider 作为记录
    const translationProvider = translationResult.provider

    return {
      id: this.generateId(item.link),
      // 修正：前端应该显示翻译后的标题
      title: translatedTitle,
      originalTitle,
      translatedTitle,
      description: translatedDescription, // 修正：前端应该显示翻译后的描述
      originalDescription,
      translatedDescription,
      price: priceInfo.currentPrice,
      originalPrice: priceInfo.originalPrice,
      currency: 'EUR',
      discountPercentage: priceInfo.discountPercentage,
      imageUrl,
      dealUrl: item.link,
      category: this.mapCategory(item.categories),
      source: 'Sparhamster.at',
      publishedAt,
      expiresAt,
      language: 'de',
      translationProvider: translationProvider,
      isTranslated: true,
      categories: item.categories || [],
      content: this.cleanHtml(content)
    }
  }

  private hasPriceInTitle(title: string): boolean {
    // 检查标题是否包含标准的价格格式 "um X € statt Y €"
    const pricePatterns = [
      /um\s+\d+(?:[.,]\d+)?\s*€\s+statt\s+\d+(?:[.,]\d+)?\s*€/i,
      /für\s+\d+(?:[.,]\d+)?\s*€\s+statt\s+\d+(?:[.,]\d+)?\s*€/i,
      /\d+(?:[.,]\d+)?\s*€\s+statt\s+\d+(?:[.,]\d+)?\s*€/i,
    ]

    return pricePatterns.some(pattern => pattern.test(title))
  }

  private extractPriceInfo(title: string, content: string): {
    currentPrice?: string
    originalPrice?: string
    discountPercentage?: number
  } {
    const text = title + ' ' + content

    // 匹配各种价格格式
    const pricePatterns = [
      // "10 € statt 21 €" 格式
      /(\d+(?:[.,]\d+)?)\s*€\s*statt\s*(\d+(?:[.,]\d+)?)\s*€/i,
      // "von 21€ auf 10€" 格式
      /von\s*(\d+(?:[.,]\d+)?)\s*€\s*auf\s*(\d+(?:[.,]\d+)?)\s*€/i,
      // "ursprünglich 21€, jetzt 10€" 格式
      /ursprünglich\s*(\d+(?:[.,]\d+)?)\s*€.*?jetzt\s*(\d+(?:[.,]\d+)?)\s*€/i,
      // "UVP: 21€, Preis: 10€" 格式
      /UVP:?\s*(\d+(?:[.,]\d+)?)\s*€.*?Preis:?\s*(\d+(?:[.,]\d+)?)\s*€/i
    ]

    for (const pattern of pricePatterns) {
      const match = text.match(pattern)
      if (match) {
        const originalPrice = match[2] || match[1]
        const currentPrice = match[1] || match[2]

        if (originalPrice && currentPrice) {
          const original = parseFloat(originalPrice.replace(',', '.'))
          const current = parseFloat(currentPrice.replace(',', '.'))

          if (current < original) {
            const discountPercentage = Math.round(((original - current) / original) * 100)
            return {
              currentPrice: current.toFixed(2),
              originalPrice: original.toFixed(2),
              discountPercentage
            }
          }
        }
      }
    }

    // 如果没有找到折扣价格，尝试提取单个价格
    const singlePriceMatch = text.match(/(\d+(?:[.,]\d+)?)\s*€/)
    if (singlePriceMatch) {
      return {
        currentPrice: parseFloat(singlePriceMatch[1].replace(',', '.')).toFixed(2)
      }
    }

    return {}
  }

  private extractImageUrl(content: string): string | null {
    // 从HTML内容中提取图片URL
    const imgMatches = [
      // img标签
      /<img[^>]+src=["']([^"']+)["'][^>]*>/i,
      // WordPress媒体格式
      /wp-content\/uploads\/[^"'\s]+\.(jpg|jpeg|png|gif|webp)/i,
      // Amazon图片
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

  private async extractImageFromDealPage(dealUrl: string): Promise<string | null> {
    try {
      // 只抓取Sparhamster.at的内部链接，避免抓取外部商店
      if (!dealUrl.includes('sparhamster.at')) {
        return null
      }

      const response = await fetch(dealUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (!response.ok) {
        return null
      }

      const html = await response.text()

      // 寻找多种可能的图片格式
      const imagePatterns = [
        // 产品图片 - og:image
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        // Twitter图片
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        // 主要图片标签
        /<img[^>]+class=[^>]*(?:product|deal|main|featured)[^>]*src=["']([^"']+)["'][^>]*>/i,
        // 任何图片标签
        /<img[^>]+src=["']([^"']+)["'][^>]*>/i
      ]

      for (const pattern of imagePatterns) {
        const match = html.match(pattern)
        if (match && match[1]) {
          let imageUrl = match[1]

          // 确保URL是完整的
          if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl
          } else if (imageUrl.startsWith('/')) {
            imageUrl = 'https://www.sparhamster.at' + imageUrl
          }

          // 验证图片URL格式
          if (imageUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
            return imageUrl
          }
        }
      }

      return null
    } catch (error) {
      console.error('Error extracting image from deal page:', error)
      return null
    }
  }

  private getPlaceholderImage(categories?: string[]): string {
    // 使用可用的占位图服务或本地图片
    if (!categories) return 'https://picsum.photos/300/200?random=1'

    const categoryImages: Record<string, string> = {
      'elektronik': 'https://picsum.photos/300/200?random=2',
      'amazon': 'https://picsum.photos/300/200?random=3',
      'fashion': 'https://picsum.photos/300/200?random=4',
      'gaming': 'https://picsum.photos/300/200?random=5',
      'haushalt': 'https://picsum.photos/300/200?random=6',
      'beauty': 'https://picsum.photos/300/200?random=7',
      'lebensmittel': 'https://picsum.photos/300/200?random=8'
    }

    for (const category of categories) {
      const key = category.toLowerCase()
      if (categoryImages[key]) {
        return categoryImages[key]
      }
    }

    return 'https://picsum.photos/300/200?random=9'
  }

  private mapCategory(categories?: string[]): string {
    if (!categories || categories.length === 0) return 'General'

    const categoryMapping: Record<string, string> = {
      'elektronik': 'Electronics',
      'amazon': 'Electronics',
      'fashion': 'Fashion',
      'kleidung': 'Fashion',
      'gaming': 'Gaming',
      'spiele': 'Gaming',
      'haushalt': 'Home & Kitchen',
      'küche': 'Home & Kitchen',
      'beauty': 'Beauty & Health',
      'sport': 'Sports & Outdoor',
      'auto': 'Automotive',
      'bücher': 'Books',
      'musik': 'Music & Movies'
    }

    for (const category of categories) {
      const key = category.toLowerCase()
      if (categoryMapping[key]) {
        return categoryMapping[key]
      }
    }

    return categories[0] || 'General'
  }

  private cleanDescription(description: string): string {
    return description
      .replace(/<[^>]*>/g, '') // 移除HTML标签
      .replace(/&[a-zA-Z0-9#]+;/g, '') // 移除HTML实体
      .replace(/\s+/g, ' ') // 压缩空白
      .trim()
      .substring(0, 300) // 限制长度
  }

  private cleanHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // 移除脚本
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // 移除样式
      .replace(/<!--[\s\S]*?-->/g, '') // 移除注释
      .trim()
  }

  private cleanTitleFromPriceInfo(title: string): string {
    // 移除标题中的价格信息，只保留产品名称
    let cleanTitle = title

    // 移除各种价格格式(按优先级排序)
    const pricePatterns = [
      // "um 70 € statt 120 €" 格式
      /\s+um\s+\d+(?:[.,]\d+)?\s*€\s+statt\s+\d+(?:[.,]\d+)?\s*€/gi,
      // "für 70€ statt 120€" 格式
      /\s+für\s+\d+(?:[.,]\d+)?\s*€\s+statt\s+\d+(?:[.,]\d+)?\s*€/gi,
      // "70€ statt 120€" 格式
      /\s+\d+(?:[.,]\d+)?\s*€\s+statt\s+\d+(?:[.,]\d+)?\s*€/gi,
      // "= 4,58 € statt 19,99 €" 格式
      /\s*=\s*\d+(?:[.,]\d+)?\s*€\s+statt\s+\d+(?:[.,]\d+)?\s*€.*$/gi,
      // 以价格开头的格式
      /^\d+(?:[.,]\d+)?\s*€.*?–\s*/gi,
    ]

    for (const pattern of pricePatterns) {
      cleanTitle = cleanTitle.replace(pattern, '')
    }

    // 特殊处理: 移除 "– 价格 + 描述" 但保留产品主名称
    // 匹配 "– 30€ Startgutschrift für..." 这样的结构
    cleanTitle = cleanTitle.replace(/\s*–\s*\d+(?:[.,]\d+)?\s*€\s+\w+.*$/gi, '')

    // 清理多余的空格和标点
    cleanTitle = cleanTitle
      .replace(/\s+/g, ' ')
      .replace(/[–-]\s*$/, '')
      .trim()

    return cleanTitle
  }

  private generateId(url: string): string {
    // 从URL生成稳定的唯一ID
    // 首先尝试从URL路径提取稳定的标识符
    const urlPath = url.split('/').pop()?.replace(/[^a-zA-Z0-9-]/g, '') || ''

    if (urlPath && urlPath.length >= 6) {
      // 如果URL路径足够长且包含有意义的内容，直接使用
      return urlPath.toLowerCase()
    }

    // 否则，使用URL的稳定哈希值生成ID
    return this.hashString(url)
  }

  private hashString(str: string): string {
    // 简单但稳定的字符串哈希函数
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }

    // 转换为正数并生成9位字符的ID
    const positive = Math.abs(hash)
    return positive.toString(36).padStart(9, '0').substr(0, 9)
  }
}

// 导出单例实例
// 你需要在使用此实例的地方注入 translationManager
// 例如:
// import { createTranslationManager } from './translation-setup'
// const translationManager = createTranslationManager({ ...config })
// export const sparhamsterFetcher = new SparhamsterFetcher(translationManager)