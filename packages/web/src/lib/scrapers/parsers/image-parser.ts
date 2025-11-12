/**
 * 图片提取解析器
 * 从不同来源提取产品图片URL
 */

import { createModuleLogger } from '../../logger'

const logger = createModuleLogger('scrapers:image-parser')

/**
 * 图片解析器
 */
export class ImageParser {
  /**
   * 从 HTML 内容中提取图片 URL
   */
  extractImageUrl(content: string): string | null {
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
   * 从优惠详情页提取图片
   *
   * 策略：
   * 1. og:image (Open Graph)
   * 2. twitter:image
   * 3. 包含 product/deal/main/featured class 的图片
   * 4. 第一个找到的图片
   */
  async extractImageFromDealPage(dealUrl: string): Promise<string | null> {
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

          // 处理相对 URL
          imageUrl = this.normalizeImageUrl(imageUrl, dealUrl)

          // 验证是否为图片 URL
          if (this.isValidImageUrl(imageUrl)) {
            return imageUrl
          }
        }
      }

      return null
    } catch (error) {
      logger.error('Error extracting image from deal page', error as Error)
      return null
    }
  }

  /**
   * 标准化图片 URL
   */
  private normalizeImageUrl(imageUrl: string, baseUrl: string): string {
    if (imageUrl.startsWith('//')) {
      return 'https:' + imageUrl
    } else if (imageUrl.startsWith('/')) {
      const urlObj = new URL(baseUrl)
      return `${urlObj.protocol}//${urlObj.host}${imageUrl}`
    }
    return imageUrl
  }

  /**
   * 验证是否为有效的图片 URL
   */
  private isValidImageUrl(url: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url)
  }

  /**
   * 获取占位符图片
   *
   * 根据分类返回不同的占位符
   */
  getPlaceholderImage(categories?: string[]): string {
    if (!categories) return 'https://picsum.photos/300/200?random=1'

    // 11个标准分类占位图，与 category-mapping.ts 保持一致
    const categoryImages: Record<string, string> = {
      'electronics': 'https://picsum.photos/300/200?random=2',
      'elektronik': 'https://picsum.photos/300/200?random=2',
      'appliances': 'https://picsum.photos/300/200?random=3',
      'fashion': 'https://picsum.photos/300/200?random=4',
      'beauty': 'https://picsum.photos/300/200?random=7',
      'food': 'https://picsum.photos/300/200?random=8',
      'lebensmittel': 'https://picsum.photos/300/200?random=8',
      'sports': 'https://picsum.photos/300/200?random=9',
      'family-kids': 'https://picsum.photos/300/200?random=10',
      'home': 'https://picsum.photos/300/200?random=6',
      'haushalt': 'https://picsum.photos/300/200?random=6',
      'auto': 'https://picsum.photos/300/200?random=11',
      'entertainment': 'https://picsum.photos/300/200?random=5',
      'gaming': 'https://picsum.photos/300/200?random=5',
      'other': 'https://picsum.photos/300/200?random=12'
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

// 导出单例
export const imageParser = new ImageParser()
