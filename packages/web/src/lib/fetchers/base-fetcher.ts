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
}