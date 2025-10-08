/**
 * 商家信息解析器
 * 从 HTML 内容中提取商家信息（URL、名称、Logo）
 */

import { createModuleLogger } from '../../logger'

const logger = createModuleLogger('scrapers:merchant-parser')

export interface MerchantInfo {
  merchantUrl: string
  merchantName?: string
  merchantLogo?: string
}

interface MerchantCandidate {
  url: string
  name?: string
  logo?: string
  score: number
}

/**
 * 从 HTML 内容中智能提取商家信息
 *
 * 算法：
 * 1. 提取所有链接及其内部内容
 * 2. 对每个链接进行评分
 * 3. 选择得分最高的作为商家链接
 *
 * 评分规则：
 * - 包含图片: +100
 * - 包含 "zum deal" / "zum angebot": +20
 * - 包含 "vergleichspreis": -50
 * - 识别为比价网站 (geizhals, idealo): -200
 */
export class MerchantParser {
  /**
   * 提取商家信息
   */
  extractMerchantInfo(content: string, fallbackUrl: string): MerchantInfo {
    const candidates = this.findMerchantCandidates(content)

    if (candidates.length > 0) {
      // 排序，得分最高的在最前面
      candidates.sort((a, b) => b.score - a.score)
      const bestMatch = candidates[0]

      if (bestMatch.score > 0) {
        logger.debug('Selected best merchant URL', {
          url: bestMatch.url,
          score: bestMatch.score
        })
        return {
          merchantUrl: bestMatch.url,
          merchantName: bestMatch.name,
          merchantLogo: bestMatch.logo,
        }
      }
    }

    logger.debug('No reliable merchant URL found, using fallback', { fallbackUrl })
    return { merchantUrl: fallbackUrl }
  }

  /**
   * 查找商家候选链接
   */
  private findMerchantCandidates(content: string): MerchantCandidate[] {
    const candidates: MerchantCandidate[] = []
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
    const matches = content.matchAll(linkRegex)

    for (const match of matches) {
      const url = match[1]
      const innerHtml = match[2]

      if (!url.startsWith('http')) continue

      const candidate = this.evaluateLink(url, innerHtml)
      candidates.push(candidate)
    }

    return candidates
  }

  /**
   * 评估链接质量
   */
  private evaluateLink(url: string, innerHtml: string): MerchantCandidate {
    let score = 0
    let logo: string | undefined
    let name: string | undefined

    // 检查链接内部是否有图片 (这是最可靠的线索)
    const imgMatch = innerHtml.match(
      /<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["']/i
    )
    if (imgMatch) {
      logo = imgMatch[1]
      name = imgMatch[2]
      score += 100 // 包含图片的链接是首选

      // 根据图片 alt 文本或 src 识别比价网站，并大力扣分
      const logoIdentifier = `${name?.toLowerCase()} ${logo?.toLowerCase()}`
      if (
        logoIdentifier.includes('geizhals') ||
        logoIdentifier.includes('idealo')
      ) {
        score -= 200
      }
    }

    // 根据链接文本内容进行加分/扣分
    const textContent = innerHtml.replace(/<[^>]+>/g, '').toLowerCase()
    if (textContent.includes('vergleichspreis')) score -= 50 // "比价"
    if (
      textContent.includes('zum deal') ||
      textContent.includes('zum angebot')
    ) {
      score += 20 // "去优惠"
    }

    return { url, name, logo, score }
  }

  /**
   * 从标签中提取潜在商家名称
   *
   * 规则：首字母大写的标签可能是商家名（如 Amazon, MediaMarkt）
   */
  extractMerchantFromTags(tags: string[]): string | undefined {
    for (const tag of tags) {
      // 检查是否首字母大写
      if (tag.length > 0 && tag[0] === tag[0].toUpperCase()) {
        return tag
      }
    }
    return undefined
  }

  /**
   * 从 slug 匹配已知商家
   */
  matchKnownMerchant(tags: string[]): { name: string; slug: string } | undefined {
    const knownMerchants: Record<string, string> = {
      'amazon-de': 'Amazon',
      'mediamarkt': 'MediaMarkt',
      'saturn': 'Saturn',
      'conrad': 'Conrad',
      'notebooksbilliger': 'Notebooksbilliger',
      'alternate': 'Alternate',
    }

    for (const tag of tags) {
      const slug = tag.toLowerCase()
      if (knownMerchants[slug]) {
        return { name: knownMerchants[slug], slug }
      }
    }

    return undefined
  }
}

// 导出单例
export const merchantParser = new MerchantParser()
