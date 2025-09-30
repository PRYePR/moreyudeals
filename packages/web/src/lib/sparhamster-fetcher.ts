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
    try {
      console.log('🔍 Fetching deals from WordPress API...')
      const response = await fetch(this.apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const posts: WordPressPost[] = await response.json()
      console.log(`📦 Fetched ${posts.length} posts from WordPress API`)

      const deals: SparhamsterDeal[] = []

      for (const post of posts) {
        const deal = await this.parsePostItem(post)
        if (deal) {
          deals.push(deal)
        }
      }

      console.log(`✅ Successfully parsed ${deals.length} deals`)
      return deals
    } catch (error) {
      console.error('❌ Error fetching Sparhamster deals:', error)
      return []
    }
  }

  private async parsePostItem(post: WordPressPost): Promise<SparhamsterDeal | null> {
    if (!post.title?.rendered || !post.link) {
      return null
    }

    const originalTitle = post.title.rendered
    const originalDescription = this.cleanDescription(post.excerpt.rendered || '')
    const content = post.content.rendered || ''

    // 提取价格信息
    const priceInfo = this.extractPriceInfo(originalTitle, content)

    // 提取图片 - 优先使用 WordPress 特色图片
    let imageUrl = this.extractFeaturedImage(post)
    if (!imageUrl) {
      imageUrl = this.extractImageUrl(content)
    }
    if (!imageUrl && post.link) {
      imageUrl = await this.extractImageFromDealPage(post.link)
    }

    // 提取分类名称
    const categoryNames = this.extractCategoryNames(post)

    if (!imageUrl) {
      imageUrl = this.getPlaceholderImage(categoryNames)
    }

    // 生成过期时间（设为30天后）
    const publishedAt = new Date(post.date)
    const expiresAt = new Date(publishedAt.getTime() + 30 * 24 * 60 * 60 * 1000)

    let titleToTranslate = originalTitle

    // 仅当标题包含 "X statt Y" 这种明确的折扣格式时，才清洗标题
    if (this.hasPriceInTitle(originalTitle)) {
      console.log(`✨ Cleaning price from title: "${originalTitle}"`)
      titleToTranslate = this.cleanTitleFromPriceInfo(originalTitle)
      console.log(`📝 Cleaned title: "${titleToTranslate}"`)
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
    const merchantInfo = this.extractMerchantInfo(content, post.link)

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
      content: this.cleanHtml(content),
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

  private hasPriceInTitle(title: string): boolean {
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

    const pricePatterns = [
      /(\d+(?:[.,]\d+)?)\s*€\s*statt\s*(\d+(?:[.,]\d+)?)\s*€/i,
      /von\s*(\d+(?:[.,]\d+)?)\s*€\s*auf\s*(\d+(?:[.,]\d+)?)\s*€/i,
      /ursprünglich\s*(\d+(?:[.,]\d+)?)\s*€.*?jetzt\s*(\d+(?:[.,]\d+)?)\s*€/i,
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

    const singlePriceMatch = text.match(/(\d+(?:[.,]\d+)?)\s*€/)
    if (singlePriceMatch) {
      return {
        currentPrice: parseFloat(singlePriceMatch[1].replace(',', '.')).toFixed(2)
      }
    }

    return {}
  }

  private extractMerchantInfo(
    content: string,
    fallbackUrl: string
  ): {
    merchantUrl: string;
    merchantName?: string;
    merchantLogo?: string;
  } {
    const candidates: Array<{
      url: string;
      name?: string;
      logo?: string;
      score: number;
    }> = [];
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const matches = content.matchAll(linkRegex);

    for (const match of matches) {
      const url = match[1];
      const innerHtml = match[2];

      if (!url.startsWith('http')) continue;

      let score = 0;
      let logo: string | undefined;
      let name: string | undefined;

      // 检查链接内部是否有图片 (这是最可靠的线索)
      const imgMatch = innerHtml.match(
        /<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["']/i
      );
      if (imgMatch) {
        logo = imgMatch[1];
        name = imgMatch[2];
        score += 100; // 包含图片的链接是首选

        // 根据图片 alt 文本或 src 识别比价网站，并大力扣分
        const logoIdentifier = `${name?.toLowerCase()} ${logo?.toLowerCase()}`;
        if (
          logoIdentifier.includes('geizhals') ||
          logoIdentifier.includes('idealo')
        ) {
          score -= 200;
        }
      }

      // 根据链接文本内容进行加分/扣分
      const textContent = innerHtml.replace(/<[^>]+>/g, '').toLowerCase();
      if (textContent.includes('vergleichspreis')) score -= 50; // "比价"
      if (
        textContent.includes('zum deal') ||
        textContent.includes('zum angebot')
      ) {
        score += 20; // "去优惠"
      }

      candidates.push({ url, name, logo, score });
    }

    if (candidates.length > 0) {
      // 排序，得分最高的在最前面
      candidates.sort((a, b) => b.score - a.score);
      const bestMatch = candidates[0];

      if (bestMatch.score > 0) {
        console.log(
          `✅ Selected best merchant URL: ${bestMatch.url} (Score: ${bestMatch.score})`
        );
        return {
          merchantUrl: bestMatch.url,
          merchantName: bestMatch.name,
          merchantLogo: bestMatch.logo,
        };
      }
    }

    console.log(`⚠️ No reliable merchant URL found, using fallback: ${fallbackUrl}`);
    return { merchantUrl: fallbackUrl };
  }

  private extractImageUrl(content: string): string | null {
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

  private async extractImageFromDealPage(dealUrl: string): Promise<string | null> {
    try {
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

      const imagePatterns = [
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<img[^>]+class=[^>]*(?:product|deal|main|featured)[^>]*src=["']([^"']+)["'][^>]*>/i,
        /<img[^>]+src=["']([^"']+)["'][^>]*>/i
      ]

      for (const pattern of imagePatterns) {
        const match = html.match(pattern)
        if (match && match[1]) {
          let imageUrl = match[1]

          if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl
          } else if (imageUrl.startsWith('/')) {
            imageUrl = 'https://www.sparhamster.at' + imageUrl
          }

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
      .replace(/<[^>]*>/g, '')
      .replace(/&[a-zA-Z0-9#]+;/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 300)
  }

  private cleanHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .trim()
  }

  private cleanTitleFromPriceInfo(title: string): string {
    let cleanTitle = title

    const pricePatterns = [
      /\s+um\s+\d+(?:[.,]\d+)?\s*€\s+statt\s+\d+(?:[.,]\d+)?\s*€/gi,
      /\s+für\s+\d+(?:[.,]\d+)?\s*€\s+statt\s+\d+(?:[.,]\d+)?\s*€/gi,
      /\s+\d+(?:[.,]\d+)?\s*€\s+statt\s+\d+(?:[.,]\d+)?\s*€/gi,
      /\s*=\s*\d+(?:[.,]\d+)?\s*€\s+statt\s+\d+(?:[.,]\d+)?\s*€.*$/gi,
      /^\d+(?:[.,]\d+)?\s*€.*?–\s*/gi,
    ]

    for (const pattern of pricePatterns) {
      cleanTitle = cleanTitle.replace(pattern, '')
    }

    cleanTitle = cleanTitle.replace(/\s*–\s*\d+(?:[.,]\d+)?\s*€\s+\w+.*$/gi, '')

    cleanTitle = cleanTitle
      .replace(/\s+/g, ' ')
      .replace(/[–-]\s*$/, '')
      .trim()

    return cleanTitle
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