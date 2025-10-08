/**
 * 缓存键生成工具
 * 统一管理所有缓存键的命名规范
 */

/**
 * 缓存键前缀
 */
export const CACHE_PREFIXES = {
  DEAL: 'deal',
  DEALS: 'deals',
  TRANSLATION: 'translation',
  CATEGORY: 'category',
  MERCHANT: 'merchant',
} as const

/**
 * 缓存 TTL 配置（秒）
 */
export const CACHE_TTL = {
  DEAL: 5 * 60,           // 5 分钟
  DEALS_LIST: 10 * 60,    // 10 分钟
  TRANSLATION: 24 * 60 * 60, // 24 小时
  CATEGORY: 60 * 60,      // 1 小时
  MERCHANT: 24 * 60 * 60, // 24 小时
} as const

/**
 * 缓存键生成器
 */
export class CacheKeyGenerator {
  private prefix: string

  constructor(prefix: string = 'moreyudeals') {
    this.prefix = prefix
  }

  /**
   * 生成完整的缓存键
   */
  private buildKey(type: string, ...parts: string[]): string {
    return [this.prefix, type, ...parts].filter(Boolean).join(':')
  }

  /**
   * 生成单个 Deal 的缓存键
   */
  dealById(dealId: string): string {
    return this.buildKey(CACHE_PREFIXES.DEAL, dealId)
  }

  /**
   * 生成所有 Deals 列表的缓存键
   */
  allDeals(): string {
    return this.buildKey(CACHE_PREFIXES.DEALS, 'all')
  }

  /**
   * 生成分页 Deals 的缓存键
   */
  dealsByPage(page: number, perPage: number): string {
    return this.buildKey(CACHE_PREFIXES.DEALS, 'page', `${page}-${perPage}`)
  }

  /**
   * 生成翻译结果的缓存键
   */
  translation(text: string, from: string, to: string): string {
    // 使用文本的哈希值作为键的一部分，避免键过长
    const textHash = this.hashString(text)
    return this.buildKey(CACHE_PREFIXES.TRANSLATION, `${from}-${to}`, textHash)
  }

  /**
   * 生成分类数据的缓存键
   */
  category(categorySlug: string): string {
    return this.buildKey(CACHE_PREFIXES.CATEGORY, categorySlug)
  }

  /**
   * 生成商家信息的缓存键
   */
  merchant(merchantSlug: string): string {
    return this.buildKey(CACHE_PREFIXES.MERCHANT, merchantSlug)
  }

  /**
   * 简单字符串哈希函数
   */
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

// 导出默认实例
export const cacheKeys = new CacheKeyGenerator()
