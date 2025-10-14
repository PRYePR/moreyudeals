/**
 * 价格信息解析器
 * 从文本中提取价格、原价和折扣信息
 *
 * 此模块被 web 和 worker 包共享使用
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
   *
   * 支持的模式：
   * - "84,99€ statt 123,59€" (现价 statt 原价)
   * - "von 123,59€ auf 84,99€" (原价 auf 现价)
   * - "ursprünglich 123,59€ jetzt 84,99€"
   * - "UVP: 123,59€ Preis: 84,99€"
   * - "um 84,99€ statt 123,59€"
   * - "für 84,99€ statt 123,59€"
   */
  private extractDiscountPrice(text: string): PriceInfo | null {
    const pricePatterns = [
      // "84,99€ statt 123,59€" -> currentPrice=84.99, originalPrice=123.59
      /(?:um|für)?\s*(\d+(?:[.,]\d+)?)\s*€\s+statt\s+(\d+(?:[.,]\d+)?)\s*€/i,

      // "von 123,59€ auf 84,99€" -> originalPrice=123.59, currentPrice=84.99
      /von\s+(\d+(?:[.,]\d+)?)\s*€\s+auf\s+(\d+(?:[.,]\d+)?)\s*€/i,

      // "ursprünglich 123,59€ ... jetzt 84,99€"
      /ursprünglich\s+(\d+(?:[.,]\d+)?)\s*€.*?jetzt\s+(\d+(?:[.,]\d+)?)\s*€/i,

      // "UVP: 123,59€ ... Preis: 84,99€"
      /UVP:?\s+(\d+(?:[.,]\d+)?)\s*€.*?Preis:?\s+(\d+(?:[.,]\d+)?)\s*€/i,
    ]

    for (const pattern of pricePatterns) {
      const match = text.match(pattern)
      if (match) {
        let originalPrice: string
        let currentPrice: string

        // 根据不同模式确定哪个是现价、哪个是原价
        if (pattern.source.includes('statt')) {
          // "84,99€ statt 123,59€" - 第一个是现价，第二个是原价
          currentPrice = match[1]
          originalPrice = match[2]
        } else if (pattern.source.includes('von.*auf')) {
          // "von 123,59€ auf 84,99€" - 第一个是原价，第二个是现价
          originalPrice = match[1]
          currentPrice = match[2]
        } else if (pattern.source.includes('ursprünglich')) {
          // "ursprünglich 123,59€ jetzt 84,99€" - 第一个是原价，第二个是现价
          originalPrice = match[1]
          currentPrice = match[2]
        } else if (pattern.source.includes('UVP')) {
          // "UVP: 123,59€ Preis: 84,99€" - 第一个是原价，第二个是现价
          originalPrice = match[1]
          currentPrice = match[2]
        } else {
          continue
        }

        if (originalPrice && currentPrice) {
          const original = parseFloat(originalPrice.replace(',', '.'))
          const current = parseFloat(currentPrice.replace(',', '.'))

          // 确保现价 < 原价才是有效折扣
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
   * 注意：此方法只在没有找到折扣价格对时调用
   * 会尝试找到最大的价格值，避免被运费等干扰
   */
  private extractSinglePrice(text: string): string | null {
    // 排除常见的干扰模式
    const excludePatterns = [
      /versand(?:kosten)?.*?(\d+(?:[.,]\d+)?)\s*€/gi,  // 运费
      /shipping.*?(\d+(?:[.,]\d+)?)\s*€/gi,             // shipping cost
      /porto.*?(\d+(?:[.,]\d+)?)\s*€/gi,                // 邮费
      /gebühr.*?(\d+(?:[.,]\d+)?)\s*€/gi,               // 费用
    ]

    let cleanText = text
    for (const pattern of excludePatterns) {
      cleanText = cleanText.replace(pattern, '')
    }

    // 提取所有价格
    const priceMatches = Array.from(cleanText.matchAll(/(\d+(?:[.,]\d+)?)\s*€/g))

    if (priceMatches.length === 0) {
      return null
    }

    // 如果只有一个价格，直接返回
    if (priceMatches.length === 1) {
      return parseFloat(priceMatches[0][1].replace(',', '.')).toFixed(2)
    }

    // 多个价格时，选择最大值（通常是产品主价格）
    // 排除明显过大的异常值（>10000€）
    const prices = priceMatches
      .map(m => parseFloat(m[1].replace(',', '.')))
      .filter(p => p > 0 && p < 10000)
      .sort((a, b) => b - a)  // 降序排序

    if (prices.length > 0) {
      return prices[0].toFixed(2)  // 返回最大值
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
