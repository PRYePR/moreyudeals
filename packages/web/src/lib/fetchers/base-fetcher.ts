import { CoreTranslationManager } from '../translation/translation-manager'
import type { Deal, FetcherConfig, FetchResult } from './types'

/**
 * 抽象基类：所有数据源 Fetcher 的统一接口
 */
export abstract class BaseFetcher {
  protected translationManager: CoreTranslationManager
  protected sourceName: string

  constructor(translationManager: CoreTranslationManager, sourceName: string) {
    this.translationManager = translationManager
    this.sourceName = sourceName
  }

  /**
   * 抓取优惠信息的主方法（子类必须实现）
   */
  abstract fetchDeals(config?: FetcherConfig): Promise<FetchResult>

  /**
   * 通用工具方法：翻译文本
   */
  protected async translateText(text: string, from: 'de' | 'en' = 'de', to: 'zh' = 'zh'): Promise<string> {
    if (!text || text.trim() === '') {
      return ''
    }

    try {
      const result = await this.translationManager.translate({
        text,
        from,
        to
      })
      return result.translatedText
    } catch (error) {
      console.error(`Translation failed for text: "${text.substring(0, 50)}..."`, error)
      return text // 翻译失败时返回原文
    }
  }

  /**
   * 通用工具方法：清理 HTML 标签
   */
  protected cleanHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&[a-zA-Z0-9#]+;/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * 通用工具方法：生成稳定的 ID
   */
  protected generateId(url: string): string {
    const urlPath = url.split('/').pop()?.replace(/[^a-zA-Z0-9-]/g, '') || ''

    if (urlPath && urlPath.length >= 6) {
      return urlPath.toLowerCase()
    }

    return this.hashString(url)
  }

  /**
   * 通用工具方法：字符串哈希
   */
  protected hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }

    const positive = Math.abs(hash)
    return positive.toString(36).padStart(9, '0').substring(0, 9)
  }

  /**
   * 通用工具方法：获取占位图片
   */
  protected getPlaceholderImage(categories?: string[]): string {
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

  /**
   * 通用工具方法：从 HTML 内容中提取商家链接
   */
  protected extractMerchantUrl(content: string, fallbackUrl: string): string {
    // 优先匹配包含特定关键词（如 "Zum Deal", "Zum Angebot"）的链接，这些通常是最终的商家链接
    const dealLinkMatch = content.match(
      /<a[^>]+href=["']([^"']+)["'][^>]*>.*?(?:Zum Deal|Zum Angebot|Hier kaufen).*?<\/a>/i
    )
    if (dealLinkMatch && dealLinkMatch[1]) {
      const url = dealLinkMatch[1]
      // 过滤掉非http开头的链接（如 javascript:; 或页面内锚点）
      if (url.startsWith('http')) {
        console.log(`🔗 Found merchant URL with keyword: ${url}`)
        return url
      }
    }

    // 收集所有 forward.sparhamster.at 的跳转链接及其上下文
    const forwardLinkPattern = /<a[^>]+href=["'](https?:\/\/forward\.sparhamster\.at\/[^"']+)["'][^>]*>(.*?)<\/a>/gi
    const forwardLinkMatches = Array.from(content.matchAll(forwardLinkPattern))

    if (forwardLinkMatches.length > 0) {
      console.log(`🔍 Found ${forwardLinkMatches.length} forward URLs, filtering for best match...`)

      // 应该跳过的链接文本关键词（这些通常是比价链接，不是主要购买链接）
      const skipLinkTexts = ['vergleichspreis', 'preisvergleich', 'preis vergleichen', 'vergleich']

      // 优先的链接文本关键词（这些通常是主要购买链接）
      const preferredLinkTexts = ['bewertung', 'sterne', 'rezension', 'kaufen', 'zum deal', 'zum angebot']

      // 按优先级对 forward URLs 进行评分和排序
      const scoredUrls: Array<{url: string, linkText: string, score: number}> = []

      for (const match of forwardLinkMatches) {
        const url = match[1]
        const linkText = match[2]?.toLowerCase() || ''
        let score = 0

        // 检查链接文本 - 如果是比价链接，给很低的分数
        let isComparisonLink = false
        for (const skipText of skipLinkTexts) {
          if (linkText.includes(skipText)) {
            score -= 100  // 强烈排除比价链接
            isComparisonLink = true
            break
          }
        }

        // 检查链接文本 - 如果是优先链接，给高分
        if (!isComparisonLink) {
          for (const preferredText of preferredLinkTexts) {
            if (linkText.includes(preferredText)) {
              score += 50  // 优先选择这些链接
              break
            }
          }
        }

        // 如果没有特殊关键词，根据位置给分（后面的链接通常是主要链接）
        if (score === 0) {
          score = forwardLinkMatches.indexOf(match) * 10  // 后面的链接得分更高
        }

        scoredUrls.push({ url, linkText: linkText.substring(0, 50), score })
      }

      // 按分数排序（降序）
      scoredUrls.sort((a, b) => b.score - a.score)

      // 选择得分最高的 URL
      const bestUrl = scoredUrls[0].url
      console.log(`🔗 Selected best forward URL (score: ${scoredUrls[0].score}, text: "${scoredUrls[0].linkText}"): ${bestUrl}`)

      // 如果有多个 URL，显示被跳过的
      if (scoredUrls.length > 1) {
        console.log(`   Skipped URLs:`)
        for (let i = 1; i < scoredUrls.length; i++) {
          console.log(`   - ${scoredUrls[i].url} (score: ${scoredUrls[i].score}, text: "${scoredUrls[i].linkText}")`)
        }
      }

      return bestUrl
    }

    // 如果没有 forward 链接，则寻找第一个不是指向 sparhamster.at 主站的外部链接
    const externalLinkMatches = content.matchAll(/<a[^>]+href=["'](https?:\/\/[^"']+)["']/gi)
    for (const match of externalLinkMatches) {
      const url = match[1]
      // 排除主站链接，但保留 forward 子域名
      if (!url.includes('www.sparhamster.at') && !url.match(/^https?:\/\/sparhamster\.at\//)) {
        console.log(`🔗 Found external merchant URL: ${url}`)
        return url
      }
    }

    // 如果以上方法都找不到，则返回原始的文章链接作为备用方案
    console.log(`⚠️ No merchant URL found, using fallback: ${fallbackUrl}`)
    return fallbackUrl
  }

  /**
   * 通用工具方法：追踪重定向以获取最终 URL
   */
  protected async resolveRedirectUrl(url: string, maxRedirects: number = 5): Promise<string> {
    let currentUrl = url
    let redirectCount = 0

    // 如果链接本身就是最终商家，直接返回，避免不必要的请求
    const knownMerchants = ['amazon', 'mediamarkt', 'otto', 'ebay', 'mueller']
    if (knownMerchants.some(merchant => currentUrl.includes(merchant))) {
      return currentUrl
    }

    console.log(`🔎 Resolving redirect for: ${currentUrl}`)

    while (redirectCount < maxRedirects) {
      try {
        // 对于 forward.sparhamster.at，需要使用 GET 请求来解析 HTML meta refresh
        const isForwardUrl = currentUrl.includes('forward.sparhamster.at')
        const method = isForwardUrl ? 'GET' : 'HEAD'

        const response = await fetch(currentUrl, {
          method,
          redirect: 'manual', // 关键：手动处理重定向
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          }
        })

        // 检查是否为重定向状态码 (3xx)
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('Location')
          if (location) {
            // 'Location' 头可能是相对路径，需要解析为绝对路径
            const nextUrl = new URL(location, currentUrl).href
            console.log(`↪️ HTTP redirect to: ${nextUrl}`)
            currentUrl = nextUrl
            redirectCount++
            continue
          }
        }

        // 如果是 forward URL，检查 HTML meta refresh
        if (isForwardUrl && response.status === 200) {
          const html = await response.text()
          // 匹配 <meta http-equiv="refresh" content="1; URL=https://...">
          const metaRefreshMatch = html.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*URL=([^"']+)["']/i)
          if (metaRefreshMatch && metaRefreshMatch[1]) {
            const nextUrl = metaRefreshMatch[1]
            console.log(`↪️ Meta refresh redirect to: ${nextUrl}`)
            currentUrl = nextUrl
            redirectCount++
            continue
          }
        }

        // 不是重定向，已到达最终页面
        break
      } catch (error) {
        console.error(`❌ Error resolving redirect for ${currentUrl}:`, error)
        // 出现错误时，返回最后一个已知的 URL
        return currentUrl
      }
    }

    if (redirectCount > 0) {
      console.log(`✅ Final URL after ${redirectCount} redirects: ${currentUrl}`)
    }

    return currentUrl
  }
}