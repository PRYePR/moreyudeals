import { Deal } from './fetchers/types'
import { createModuleLogger } from './logger'

const logger = createModuleLogger('detail-page-fetcher')

export interface DetailContent {
  rawHtml: string  // 新增：WordPress content.rendered 原始 HTML
  fullDescription: string
  specifications: Record<string, string>
  features: string[]
  images: string[]
  pricing: {
    currentPrice?: string
    originalPrice?: string
    currency: string
    availability: string
    shippingInfo?: string
  }
  retailer: {
    name: string
    logo?: string
    url: string
  }
  additionalContent: string
}

export class DetailPageFetcher {
  /**
   * 从 Deal 对象获取详细内容
   * @param deal - 完整的 Deal 对象，包含 content 字段
   * @returns DetailContent - 格式化的详情内容
   */
  async fetchDetailContent(deal: Deal): Promise<DetailContent> {
    try {
      logger.info('Fetching detail content for deal', { dealId: deal.id })

      // 从 deal.content 中提取图片
      const images = this.extractImagesFromContent(deal.content)

      // 如果没有从 content 中提取到图片，使用 deal.imageUrl
      if (images.length === 0 && deal.imageUrl) {
        images.push(deal.imageUrl)
      }

      // 提取商家 logo
      const retailerLogo = this.getRetailerLogo(deal.source, deal.merchantName)

      // 构建规格信息
      const specifications: Record<string, string> = {}

      if (deal.merchantName) {
        specifications['商家'] = deal.merchantName
      }

      specifications['来源'] = deal.source
      specifications['分类'] = deal.category
      specifications['发布日期'] = new Date(deal.publishedAt).toLocaleDateString('zh-CN')

      if (deal.expiresAt) {
        specifications['有效期至'] = new Date(deal.expiresAt).toLocaleDateString('zh-CN')
      }

      if (deal.voucherCode) {
        specifications['优惠码'] = deal.voucherCode
      }

      if (deal.shippingCost) {
        specifications['运费'] = deal.shippingCost
      } else {
        specifications['运费'] = '请查看商家网站'
      }

      // 提取特性列表
      const features = this.extractFeaturesFromContent(deal.content)

      // rawHtml: 直接使用 WordPress content.rendered
      const rawHtml = deal.content || ''

      // fullDescription: 原样返回 content，如果为空再退回译文/描述
      const fullDescription = deal.content || deal.translatedDescription || deal.description

      return {
        rawHtml,
        fullDescription,
        specifications,
        features,
        images,
        pricing: {
          currentPrice: deal.price,
          originalPrice: deal.originalPrice,
          currency: deal.currency,
          availability: this.getAvailabilityStatus(deal),
          shippingInfo: deal.shippingCost || '请查看商家网站了解运费详情'
        },
        retailer: {
          name: deal.merchantName || deal.source,
          logo: retailerLogo,
          url: deal.dealUrl
        },
        additionalContent: this.generateAdditionalContent(deal)
      }
    } catch (error) {
      logger.error('Error generating detail content', error as Error, { dealId: deal.id })
      return this.getEmptyDetailContent(deal)
    }
  }

  /**
   * 从 HTML 内容中提取图片 URL
   */
  private extractImagesFromContent(content: string): string[] {
    const images: string[] = []

    // 匹配 img 标签的 src 属性
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
    let match

    while ((match = imgRegex.exec(content)) !== null) {
      const src = match[1]
      // 过滤掉小图标和占位图
      if (src && !src.includes('icon') && !src.includes('logo') && !src.includes('placeholder')) {
        // 确保 URL 是完整的
        if (src.startsWith('//')) {
          images.push('https:' + src)
        } else if (src.startsWith('/')) {
          images.push('https://www.sparhamster.at' + src)
        } else if (src.startsWith('http')) {
          images.push(src)
        }
      }
    }

    // 去重
    return [...new Set(images)]
  }

  /**
   * 从内容中提取特性列表
   */
  private extractFeaturesFromContent(content: string): string[] {
    const features: string[] = []

    // 尝试提取 ul/li 列表
    const ulRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/gi
    let ulMatch

    while ((ulMatch = ulRegex.exec(content)) !== null) {
      const ulContent = ulMatch[1]
      const liRegex = /<li[^>]*>(.*?)<\/li>/gi
      let liMatch

      while ((liMatch = liRegex.exec(ulContent)) !== null) {
        const text = liMatch[1]
          .replace(/<[^>]*>/g, '') // 移除 HTML 标签
          .replace(/&[a-zA-Z0-9#]+;/g, '') // 移除 HTML 实体
          .trim()

        if (text && text.length > 3 && text.length < 200) {
          features.push(text)
        }
      }
    }

    // 如果没有提取到特性，返回默认特性
    if (features.length === 0) {
      features.push('查看原始页面了解更多产品特性')
    }

    return features.slice(0, 10) // 最多返回 10 个特性
  }

  /**
   * 获取商家 logo
   */
  private getRetailerLogo(source: string, merchantName?: string): string | undefined {
    const merchant = (merchantName || source).toLowerCase()

    const logoMap: Record<string, string> = {
      'amazon': 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg',
      'mediamarkt': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/MediaMarkt_logo.svg/200px-MediaMarkt_logo.svg.png',
      'saturn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Saturn_logo.svg/200px-Saturn_logo.svg.png',
      'otto': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Otto_logo.svg/200px-Otto_logo.svg.png',
      'ebay': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/EBay_logo.svg/200px-EBay_logo.svg.png',
      'ikea': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Ikea_logo.svg/200px-Ikea_logo.svg.png',
      'xxxlutz': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/XXXLutz_Logo.svg/200px-XXXLutz_Logo.svg.png'
    }

    for (const [key, logo] of Object.entries(logoMap)) {
      if (merchant.includes(key)) {
        return logo
      }
    }

    return undefined
  }

  /**
   * 获取可用性状态
   */
  private getAvailabilityStatus(deal: Deal): string {
    const now = new Date()
    const expiresAt = new Date(deal.expiresAt)

    if (expiresAt < now) {
      return '优惠已过期'
    }

    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysRemaining <= 1) {
      return '今天到期'
    } else if (daysRemaining <= 3) {
      return `还剩 ${daysRemaining} 天`
    } else if (daysRemaining <= 7) {
      return `本周到期 (${daysRemaining} 天)`
    } else {
      return '有效'
    }
  }

  /**
   * 生成附加内容
   */
  private generateAdditionalContent(deal: Deal): string {
    const parts: string[] = []

    if (deal.discountPercentage) {
      parts.push(`💰 节省 ${deal.discountPercentage}% - 立即抢购！`)
    }

    if (deal.tags && deal.tags.length > 0) {
      parts.push(`🏷️ 标签: ${deal.tags.join(', ')}`)
    }

    if (deal.voucherCode) {
      parts.push(`🎟️ 使用优惠码: <strong>${deal.voucherCode}</strong>`)
    }

    const merchantName = deal.merchantName || deal.source
    parts.push(`🛒 请访问 ${merchantName} 官方网站了解最新价格和库存情况。`)

    parts.push(`📅 发布时间: ${new Date(deal.publishedAt).toLocaleString('zh-CN')}`)

    if (deal.translationProvider) {
      parts.push(`🌐 由 ${deal.translationProvider} 提供翻译`)
    }

    return parts.join('<br><br>')
  }

  /**
   * 返回空的详情内容（错误情况）
   */
  private getEmptyDetailContent(deal: Deal): DetailContent {
    return {
      rawHtml: deal.content || '',
      fullDescription: deal.translatedDescription || deal.description || '暂无详细描述',
      specifications: {
        '来源': deal.source,
        '分类': deal.category
      },
      features: [],
      images: deal.imageUrl ? [deal.imageUrl] : [],
      pricing: {
        currentPrice: deal.price,
        originalPrice: deal.originalPrice,
        currency: deal.currency,
        availability: '请查看商家网站'
      },
      retailer: {
        name: deal.merchantName || deal.source,
        url: deal.dealUrl
      },
      additionalContent: '详细信息请访问商家官方网站。'
    }
  }
}

// Export singleton instance
export const detailPageFetcher = new DetailPageFetcher()