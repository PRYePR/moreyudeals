/**
 * 价格信息解析器
 * 从文本中提取价格、原价和折扣信息
 */

export interface PriceInfo {
  currentPrice?: string
  originalPrice?: string
  discountPercentage?: number
}

/**
 * 价格解析器
 */
export class PriceParser {
  /**
   * 从标题和内容中提取价格信息
   */
  extractPriceInfo(title: string, content: string): PriceInfo {
    const text = title + ' ' + content

    // 尝试提取折扣价格对（原价 -> 现价）
    const discountPrice = this.extractDiscountPrice(text)
    if (discountPrice) {
      return discountPrice
    }

    // 如果没有找到折扣，尝试提取单个价格
    const singlePrice = this.extractSinglePrice(text)
    if (singlePrice) {
      return { currentPrice: singlePrice }
    }

    return {}
  }

  /**
   * 提取折扣价格信息（原价 statt 现价）
   */
  private extractDiscountPrice(text: string): PriceInfo | null {
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

    return null
  }

  /**
   * 提取单个价格
   */
  private extractSinglePrice(text: string): string | null {
    const singlePriceMatch = text.match(/(\d+(?:[.,]\d+)?)\s*€/)
    if (singlePriceMatch) {
      return parseFloat(singlePriceMatch[1].replace(',', '.')).toFixed(2)
    }
    return null
  }

  /**
   * 检查标题中是否包含价格信息
   */
  hasPriceInTitle(title: string): boolean {
    const pricePatterns = [
      /um\s+\d+(?:[.,]\d+)?\s*€\s+statt\s+\d+(?:[.,]\d+)?\s*€/i,
      /für\s+\d+(?:[.,]\d+)?\s*€\s+statt\s+\d+(?:[.,]\d+)?\s*€/i,
      /\d+(?:[.,]\d+)?\s*€\s+statt\s+\d+(?:[.,]\d+)?\s*€/i,
    ]

    return pricePatterns.some(pattern => pattern.test(title))
  }

  /**
   * 从标题中移除价格信息
   *
   * 用途：清理标题以便翻译时更准确
   */
  cleanPriceFromTitle(title: string): string {
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

    // 移除末尾的价格信息
    cleanTitle = cleanTitle.replace(/\s*–\s*\d+(?:[.,]\d+)?\s*€\s+\w+.*$/gi, '')

    // 清理多余空格和末尾的连字符
    cleanTitle = cleanTitle
      .replace(/\s+/g, ' ')
      .replace(/[–-]\s*$/, '')
      .trim()

    return cleanTitle
  }
}

// 导出单例
export const priceParser = new PriceParser()
