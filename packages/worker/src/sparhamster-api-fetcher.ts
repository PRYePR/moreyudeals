import axios from 'axios'
import * as cheerio from 'cheerio'
import { DatabaseManager } from './database'
import { ApiFetchResult } from './types'

interface WordPressPost {
  id: number
  date: string
  modified: string
  link: string
  title: { rendered: string }
  excerpt: { rendered: string }
  content: { rendered: string }
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string
      alt_text?: string
    }>
    'wp:term'?: Array<
      Array<{
        id: number
        name: string
        slug: string
      }>
    >
  }
}

const API_URL =
  process.env.SPARHAMSTER_API_URL ||
  'https://www.sparhamster.at/wp-json/wp/v2/posts'

const API_PER_PAGE = Number(process.env.SPARHAMSTER_API_LIMIT || '40')
const FEED_ID = process.env.SPARHAMSTER_FEED_ID || 'sparhamster-api'

export class SparhamsterApiFetcher {
  constructor(private readonly database: DatabaseManager) {}

  /**
   * 添加随机延迟，模拟人类行为
   * @param minMs 最小延迟毫秒数
   * @param maxMs 最大延迟毫秒数
   */
  private async randomDelay(minMs: number = 1000, maxMs: number = 3000): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  async fetchLatest(): Promise<ApiFetchResult> {
    const result: ApiFetchResult = {
      inserted: 0,
      updated: 0,
      errors: []
    }

    try {
      const url = `${API_URL}?per_page=${API_PER_PAGE}&_embed=true&orderby=date&order=desc`

      const response = await axios.get<WordPressPost[]>(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MoreyudealsWorker/1.0)'
        },
        timeout: 15000
      })

      const posts = response.data || []
      console.log(`📥 Sparhamster API 返回 ${posts.length} 条记录`)

      for (let i = 0; i < posts.length; i++) {
        const post = posts[i]
        try {
          // 在处理每条记录之间添加随机延迟（除了第一条）
          if (i > 0) {
            await this.randomDelay(500, 2000) // 0.5-2秒随机延迟
          }

          const action = await this.processPost(post)
          if (action === 'inserted') {
            result.inserted += 1
          } else if (action === 'updated') {
            result.updated += 1
          }
        } catch (error) {
          const message = (error as Error).message || '未知错误'
          console.error(`❌ 处理帖子失败: ${message}`)
          result.errors.push(message)
        }
      }
    } catch (error) {
      const message = (error as Error).message || '请求 Sparhamster API 失败'
      console.error(`❌ 抓取 Sparhamster API 失败: ${message}`)
      result.errors.push(message)
    }

    return result
  }

  private async processPost(post: WordPressPost): Promise<'inserted' | 'updated'> {
    const originalTitle = this.cleanHtml(post.title?.rendered || '')
    const originalDescription = this.cleanHtml(post.excerpt?.rendered || '')
    const rawContent = post.content?.rendered || ''
    const contentText = this.stripHtml(rawContent)
    const categories = this.extractCategories(post)
    const priceInfo = this.extractPriceInfo(originalTitle, rawContent)

    const imageUrl =
      this.extractFeaturedImage(post) ||
      this.extractImageFromContent(rawContent) ||
      undefined

    const merchantName = this.extractMerchantName(post)

    // 提取真正的商家购买链接
    const merchantLink = this.extractMerchantLink(rawContent) || post.link

    const pubDate = new Date(post.date)
    const expiresAt = new Date(pubDate.getTime() + 30 * 24 * 60 * 60 * 1000)

    return this.database.upsertDealFromApi({
      feedId: FEED_ID,
      guid: post.link,
      link: merchantLink, // 使用提取的商家链接
      pubDate,
      categories,
      originalTitle,
      originalDescription,
      title: originalTitle,
      description: originalDescription,
      imageUrl,
      price: priceInfo.currentPrice ?? null,
      originalPrice: priceInfo.originalPrice ?? null,
      discount: priceInfo.discountPercentage ?? null,
      contentHtml: rawContent,
      contentText,
      merchantName,
      merchantLogo: undefined,
      currency: 'EUR',
      expiresAt,
      language: 'de',
      detectedLanguage: 'de'
    })
  }

  private cleanHtml(html: string): string {
    if (!html) return ''
    return this.stripHtml(html)
  }

  private stripHtml(html: string): string {
    const $ = cheerio.load(html || '')
    return $('body').text().replace(/\s+/g, ' ').trim()
  }

  private extractCategories(post: WordPressPost): string[] {
    const result: string[] = []
    const terms = post._embedded?.['wp:term']
    if (!terms) return result

    for (const group of terms) {
      for (const term of group) {
        if (term?.name) {
          result.push(term.name)
        }
      }
    }

    return Array.from(new Set(result))
  }

  private extractFeaturedImage(post: WordPressPost): string | null {
    const media = post._embedded?.['wp:featuredmedia']
    if (media && media.length > 0) {
      const url = media[0].source_url
      if (url) {
        return url
      }
    }
    return null
  }

  private extractImageFromContent(content: string): string | null {
    if (!content) return null
    const $ = cheerio.load(content)
    const img = $('img').first()
    return img.attr('src') || null
  }

  private extractMerchantName(post: WordPressPost): string | undefined {
    const tags = post._embedded?.['wp:term']?.[1]
    if (!tags) return undefined
    const capitalized = tags.find((tag) => /^[A-Z][A-Za-z0-9]+/.test(tag.name))
    return capitalized?.name
  }

  private extractPriceInfo(title: string, content: string): {
    currentPrice?: number
    originalPrice?: number
    discountPercentage?: number
  } {
    const text = `${title} ${this.stripHtml(content)}`.toLowerCase()

    const priceRegex = /(\d+(?:[.,]\d+)?)\s*(?:€|eur)/g
    const prices: number[] = []
    let match: RegExpExecArray | null
    while ((match = priceRegex.exec(text)) !== null) {
      const value = parseFloat(match[1].replace(',', '.'))
      if (!Number.isNaN(value)) {
        prices.push(value)
      }
    }

    const discountRegex = /(\d+)\s*%/
    const discountMatch = discountRegex.exec(text)
    const discountPercentage = discountMatch ? Number(discountMatch[1]) : undefined

    if (prices.length === 0) {
      return { discountPercentage }
    }

    if (prices.length === 1) {
      return {
        currentPrice: prices[0],
        discountPercentage
      }
    }

    return {
      currentPrice: Math.min(...prices),
      originalPrice: Math.max(...prices),
      discountPercentage
    }
  }

  private extractMerchantLink(content: string): string | null {
    if (!content) return null

    const $ = cheerio.load(content)

    // 策略1: 查找 forward.sparhamster.at 转发链接（最常见）
    const forwardLinks = $('a[href*="forward.sparhamster.at"]')
    if (forwardLinks.length > 0) {
      const href = $(forwardLinks[0]).attr('href')
      if (href) {
        return href // 保留转发链接，它会重定向到真实商家
      }
    }

    // 策略2: 查找包含 "Zum Angebot" (前往优惠) 的链接
    const dealLinks = $('a').filter((_, el) => {
      const text = $(el).text().toLowerCase()
      const href = $(el).attr('href') || ''

      // 匹配常见的购买/优惠按钮文本
      const keywords = [
        'zum angebot',
        'zum deal',
        'jetzt kaufen',
        'direkt zum angebot',
        'hier bestellen',
        'zum shop'
      ]

      // 检查链接文本是否包含关键词
      const hasKeyword = keywords.some(keyword => text.includes(keyword))

      // 确保不是 sparhamster 自己的链接
      const isExternalLink = Boolean(
        href &&
        !href.includes('sparhamster.at/') && // 注意斜杠，允许 forward.sparhamster.at
        !href.startsWith('#') &&
        !href.startsWith('mailto:')
      )

      return hasKeyword && isExternalLink
    })

    if (dealLinks.length > 0) {
      const href = $(dealLinks[0]).attr('href')
      if (href) {
        return href
      }
    }

    // 策略3: 查找直接的外部商家链接（亚马逊等）
    const directLinks = $('a').filter((_, el) => {
      const href = $(el).attr('href') || ''
      const text = $(el).text().toLowerCase()

      // 常见电商域名
      const merchantDomains = [
        'amazon.',
        'mediamarkt.',
        'saturn.',
        'otto.',
        'ebay.',
        'alternate.',
        'notebooksbilliger.'
      ]

      const isMerchantLink = merchantDomains.some(domain => href.includes(domain))
      const notSocialLink = !href.includes('facebook.com') &&
        !href.includes('twitter.com') &&
        !href.includes('instagram.com') &&
        !href.includes('youtube.com')

      return isMerchantLink && notSocialLink
    })

    if (directLinks.length > 0) {
      const href = $(directLinks[0]).attr('href')
      if (href) {
        return this.normalizeUrl(href)
      }
    }

    return null
  }

  private normalizeUrl(url: string): string {
    // 清理 URL，移除跟踪参数但保留必要参数
    try {
      const urlObj = new URL(url)

      // 如果是 Amazon 链接，保留 tag 参数（affiliate）
      if (urlObj.hostname.includes('amazon')) {
        const tag = urlObj.searchParams.get('tag')
        if (tag) {
          return `${urlObj.origin}${urlObj.pathname}?tag=${tag}`
        }
      }

      // 对于其他链接，返回干净的 URL
      return `${urlObj.origin}${urlObj.pathname}${urlObj.search}`
    } catch {
      // 如果 URL 解析失败，返回原始 URL
      return url
    }
  }
}
