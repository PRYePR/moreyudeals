# 阶段二: Worker 抓取与翻译设计 (STEP2_WORKER_DESIGN)

## 一、目的 (Purpose)

本文档定义 Worker 模块的重构设计,实现以下目标:

### 核心目标:
1. **真正的随机抓取**: 替换当前的"固定间隔+随机延迟"为完全随机间隔调度
2. **商家信息提取**: 从 API 响应中识别商家 logo 和名称,为联盟链接替换做准备
3. **内容标准化**: 建立统一的数据模型(content_blocks JSON),支持多数据源扩展
4. **可靠的去重**: 基于内容 hash 的去重机制,避免重复发布
5. **批量翻译优化**: 减少 API 调用次数,降低配额消耗
6. **防封禁策略**: 模拟人类行为,避免被源站识别为爬虫

### 成功标准:
- ✅ 抓取间隔完全随机(5-15分钟)
- ✅ 商家识别准确率 >90%(基于现有数据)
- ✅ 去重准确率 100%(无重复发布)
- ✅ 翻译配额节省 >50%(通过批量+缓存)
- ✅ 错误率 <1%(包含重试机制)
- ✅ 30天内无IP封禁事件

## 二、范围 (Scope)

### 包含在内:
- ✅ Scheduler 随机调度算法
- ✅ API Fetcher 防封禁策略
- ✅ Content Normalizer 数据标准化
- ✅ 商家识别逻辑(logo 提取)
- ✅ 去重与版本控制机制
- ✅ 批量翻译管道
- ✅ 数据库交互层优化
- ✅ 日志与监控规范
- ✅ 配置管理

### 不包含在内:
- ❌ 联盟链接替换实现(阶段三)
- ❌ 多数据源接入(阶段三)
- ❌ 前端展示逻辑(STEP5)
- ❌ 数据库 schema 细节(STEP3)
- ❌ 部署与运维(STEP7)

## 三、总体架构概览 (Architecture Overview)

### 3.1 模块组成

```
┌─────────────────────────────────────────────────────────────┐
│                    Worker Service 主进程                     │
└─────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
    ┌────────────┐    ┌────────────┐    ┌────────────┐
    │  Scheduler │    │ API Fetcher│    │Translation │
    │  (调度器)  │───>│  (抓取器)  │───>│   Worker   │
    └────────────┘    └────────────┘    └────────────┘
           │                  │                  │
           │                  ▼                  ▼
           │          ┌────────────┐    ┌────────────┐
           │          │  Content   │    │ Translation│
           │          │ Normalizer │    │   Manager  │
           │          └────────────┘    └────────────┘
           │                  │                  │
           │                  ▼                  │
           │          ┌────────────┐             │
           │          │   Deduper  │             │
           │          │  (去重器)  │             │
           │          └────────────┘             │
           │                  │                  │
           └──────────────────┼──────────────────┘
                              ▼
                    ┌───────────────────┐
                    │ Database Manager  │
                    │  (持久化层)       │
                    └───────────────────┘
                              │
                              ▼
                      ┌──────────────┐
                      │  PostgreSQL  │
                      └──────────────┘
```

### 3.2 数据流

```
[1. 调度器触发]
     Scheduler 计算下次运行时间 (随机 5-15 分钟)
           ↓
[2. API 抓取]
     API Fetcher → Sparhamster API (带 User-Agent 轮换)
           ↓ (返回 JSON)
[3. 内容标准化]
     Content Normalizer 提取:
       - title, description, content
       - images (featured + content)
       - merchant (从 tags 或 meta)
       - merchantLogo (从 content HTML 中的 <img>)
       - price, discount, coupon
       - categories, tags
           ↓
[4. 去重检查]
     Deduper 计算 content hash
       → 查询数据库: 是否存在相同 hash?
       → 是: 更新 updated_at,计数器+1
       → 否: 插入新记录
           ↓
[5. 翻译任务创建]
     为新记录创建 translation_jobs:
       - 类型: title, description, content_blocks
       - 批量提交 (每批10条)
           ↓
[6. 翻译执行]
     Translation Worker 轮询 pending jobs
       → 批量调用 DeepL API (多段文本)
       → 写入缓存 (Redis)
       → 更新 translation_jobs.status = 'completed'
       → 更新 deals 表的译文字段
           ↓
[7. 持久化]
     Database Manager 写入 PostgreSQL
       → 事务处理
       → 错误回滚
```

## 四、模块设计 (Module Design)

### 4.1 API Fetcher (数据抓取器)

**文件路径**: `packages/worker/src/api-fetcher.ts` (重构后)

#### 输入/输出

| 项目 | 详情 |
|------|------|
| **输入** | 无(读取环境变量配置) |
| **输出** | `ApiFetchResult { inserted: number, updated: number, errors: string[] }` |
| **副作用** | HTTP 请求到 Sparhamster API |

#### 调用频率与参数

**当前实现** (packages/worker/src/sparhamster-api-fetcher.ts:57):
```typescript
const url = `${API_URL}?per_page=${API_PER_PAGE}&_embed=true&orderby=date&order=desc`
```

**重构后**:
```typescript
// 配置 (注意: 沿用现有变量名 SPARHAMSTER_API_LIMIT)
SPARHAMSTER_API_URL=https://www.sparhamster.at/wp-json/wp/v2/posts
SPARHAMSTER_API_LIMIT=40                // 每次抓取数量 (已有变量,保持不变)
SPARHAMSTER_FETCH_INTERVAL_MIN=300      // 5分钟 (秒) - 新增
SPARHAMSTER_FETCH_INTERVAL_MAX=900      // 15分钟 (秒) - 新增

// 请求参数
?per_page=40           // 每页数量 (使用 SPARHAMSTER_API_LIMIT)
&_embed=true           // 包含 featured_media 和 terms
&orderby=date          // 按日期排序
&order=desc            // 降序
```

**频率策略**:
- 初次启动: 立即执行一次
- 后续: 随机间隔 300-900 秒(5-15分钟)
- 失败重试: 指数退避 (1分钟 → 2分钟 → 4分钟)

#### 限流策略

**请求限流**:
```typescript
class ApiRateLimiter {
  private lastRequestTime: number = 0
  private readonly minInterval = 3000  // 最小间隔 3 秒

  async waitIfNeeded(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.lastRequestTime
    if (elapsed < this.minInterval) {
      await sleep(this.minInterval - elapsed)
    }
    this.lastRequestTime = Date.now()
  }
}
```

**防封禁机制**:
1. **User-Agent 轮换** (❌ 需新增, 当前仅有固定 UA):
   ```typescript
   // 当前实现 (sparhamster-api-fetcher.ts:61): 仅一个固定 UA
   'User-Agent': 'Mozilla/5.0 (compatible; MoreyudealsWorker/1.0)'

   // 需改进为轮换池:
   const userAgents = [
     'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
     'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
   ]
   // 随机选择
   ```

2. **请求间延迟** (当前已实现: sparhamster-api-fetcher.ts:72-75):
   ```typescript
   if (i > 0) {
     await this.randomDelay(500, 2000)  // 0.5-2秒
   }
   ```

3. **Referer 头**:
   ```typescript
   headers: {
     'User-Agent': randomUserAgent(),
     'Referer': 'https://www.sparhamster.at/',
     'Accept-Language': 'de-AT,de;q=0.9,en;q=0.8'
   }
   ```

#### 异常处理

**错误类型与处理**:

| 错误类型 | HTTP 状态码 | 处理策略 |
|----------|-------------|----------|
| 网络超时 | - | 重试 3 次(指数退避) |
| 429 Too Many Requests | 429 | 等待 Retry-After 头指定时间,最长 30 分钟 |
| 500 Server Error | 500-599 | 记录日志,跳过本次,下次正常调度 |
| 401/403 Forbidden | 401, 403 | 立即告警,停止抓取 |
| JSON 解析错误 | - | 记录原始响应,跳过 |

**重试与指数退避**:
```typescript
class RetryStrategy {
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        if (this.isRetryable(error)) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 60000)  // 最大 1 分钟
          logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, { error })
          await sleep(delay)
        } else {
          throw error  // 不可重试的错误立即抛出
        }
      }
    }
    throw lastError!
  }

  private isRetryable(error: any): boolean {
    // 网络错误、超时、5xx 错误可重试
    return (
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNRESET' ||
      (error.response?.status >= 500 && error.response?.status < 600)
    )
  }
}
```

#### 实现要点

**关键改进** (相对当前实现):
1. ✅ 已有: 随机延迟 (sparhamster-api-fetcher.ts:44-47)
2. ✅ 已有: User-Agent 设置 (sparhamster-api-fetcher.ts:61)
3. ❌ 需新增: User-Agent 轮换
4. ❌ 需新增: Referer 头
5. ❌ 需新增: 429 错误处理
6. ❌ 需新增: 指数退避重试

---

### 4.2 Content Normalizer (内容标准化器)

**文件路径**: `packages/worker/src/content-normalizer.ts` (新建)

#### 输入/输出

| 项目 | 类型 | 说明 |
|------|------|------|
| **输入** | `WordPressPost` | Sparhamster API 原始响应 |
| **输出** | `NormalizedDeal` | 标准化的优惠信息对象 |

#### 统一字段定义

```typescript
interface NormalizedDeal {
  // 基础信息
  sourceSite: string                    // 'sparhamster'
  sourcePostId: string                  // WordPress post ID
  guid: string                          // 唯一标识符
  slug: string                          // URL slug

  // 标题与描述
  title: string                         // 清理后的原文标题
  description: string                   // 清理后的原文摘要

  // 内容块 (JSON 格式)
  contentBlocks: ContentBlock[]         // 结构化内容

  // 图片
  images: {
    featured?: string                   // 主图
    gallery: string[]                   // 图库
  }

  // 商家信息
  merchant?: string                     // 商家名称 (如 'Amazon', 'MediaMarkt')
  merchantLogo?: string                 // 商家 logo URL
  merchantLink: string                  // 购买链接
  affiliateLink?: string                // 联盟链接 (阶段三填充)

  // 价格与优惠
  price?: number                        // 当前价格
  originalPrice?: number                // 原价
  discount?: number                     // 折扣百分比
  currency: string                      // 货币 (EUR)
  couponCode?: string                   // 优惠码

  // 分类与标签
  categories: string[]                  // 分类
  tags: string[]                        // 标签

  // 时间
  publishedAt: Date                     // 发布时间
  expiresAt?: Date                      // 过期时间

  // 元数据
  language: string                      // 'de'
  rawPayload: string                    // 原始 JSON (用于调试)
}

interface ContentBlock {
  type: 'paragraph' | 'heading' | 'list' | 'image' | 'button' | 'divider' | 'info-box'
  content: string | string[]            // 文本内容或列表项
  attrs?: {                             // 可选属性
    level?: number                      // 标题级别 (h1-h6)
    href?: string                       // 按钮/链接 URL
    src?: string                        // 图片 URL
    alt?: string                        // 图片 alt
    className?: string                  // CSS 类名
  }
}
```

#### 数据清洗规则

**HTML 清理**:
```typescript
class HtmlCleaner {
  // 1. 移除脚本与样式
  removeScriptsAndStyles(html: string): string {
    const $ = cheerio.load(html)
    $('script, style, noscript').remove()
    return $.html()
  }

  // 2. 清理 HTML 实体
  decodeEntities(text: string): string {
    return text
      .replace(/&#8211;/g, '–')
      .replace(/&#8217;/g, "'")
      .replace(/&hellip;/g, '...')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
  }

  // 3. 移除多余空白
  normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim()
  }

  // 4. 提取纯文本
  stripHtml(html: string): string {
    const $ = cheerio.load(html)
    return $('body').text()
  }
}
```

**价格提取** (当前实现: sparhamster-api-fetcher.ts:195-232):
```typescript
// 已实现,需保留并优化
private extractPriceInfo(title: string, content: string): {
  currentPrice?: number
  originalPrice?: number
  discountPercentage?: number
} {
  // 正则匹配: "15,12 €" 或 "15.12 EUR"
  const priceRegex = /(\d+(?:[.,]\d+)?)\s*(?:€|eur)/gi
  const prices = []

  // 折扣百分比: "30%"
  const discountRegex = /(\d+)\s*%/

  // 逻辑: 最低价=当前价, 最高价=原价
  return {
    currentPrice: Math.min(...prices),
    originalPrice: Math.max(...prices),
    discountPercentage
  }
}
```

**优惠码提取** (需新增):
```typescript
private extractCouponCode(content: string): string | null {
  const $ = cheerio.load(content)

  // 策略1: 查找 class="coupon-code" 或 data-coupon
  const couponEl = $('.coupon-code, [data-coupon]').first()
  if (couponEl.length) {
    return couponEl.text().trim() || couponEl.attr('data-coupon')
  }

  // 策略2: 正则匹配 "Code: XXXX" 或 "Gutscheincode: XXXX"
  const codeRegex = /(?:Code|Gutschein|Coupon):\s*([A-Z0-9]{4,})/i
  const match = content.match(codeRegex)
  return match ? match[1] : null
}
```

#### HTML → JSON 解析策略

**ContentBlock 生成** (需新增):
```typescript
class ContentBlockParser {
  parse(html: string): ContentBlock[] {
    const $ = cheerio.load(html)
    const blocks: ContentBlock[] = []

    // 遍历顶层元素
    $('body').children().each((_, el) => {
      const tagName = el.tagName.toLowerCase()

      // 信息框 (Sparhamster 特有)
      if ($(el).hasClass('box-info')) {
        blocks.push({
          type: 'info-box',
          content: $(el).text().trim(),
          attrs: { className: 'box-info' }
        })
        return
      }

      // 标题
      if (/^h[1-6]$/.test(tagName)) {
        blocks.push({
          type: 'heading',
          content: $(el).text().trim(),
          attrs: { level: parseInt(tagName[1]) }
        })
        return
      }

      // 段落
      if (tagName === 'p') {
        const text = $(el).text().trim()
        if (text) {
          blocks.push({
            type: 'paragraph',
            content: text
          })
        }
        return
      }

      // 列表
      if (tagName === 'ul' || tagName === 'ol') {
        const items = $(el).find('li').map((_, li) => $(li).text().trim()).get()
        blocks.push({
          type: 'list',
          content: items
        })
        return
      }

      // 图片
      if (tagName === 'img') {
        blocks.push({
          type: 'image',
          content: '',
          attrs: {
            src: $(el).attr('src'),
            alt: $(el).attr('alt')
          }
        })
        return
      }

      // 按钮/链接 (包含关键词)
      if (tagName === 'a') {
        const text = $(el).text().toLowerCase()
        const keywords = ['zum angebot', 'jetzt kaufen', 'zum shop']
        if (keywords.some(kw => text.includes(kw))) {
          blocks.push({
            type: 'button',
            content: $(el).text().trim(),
            attrs: { href: $(el).attr('href') }
          })
          return
        }
      }
    })

    return blocks
  }
}
```

**示例输出**:
```json
{
  "contentBlocks": [
    {
      "type": "info-box",
      "content": "Wieder bestellbar!",
      "attrs": { "className": "box-info" }
    },
    {
      "type": "paragraph",
      "content": "Die Belkin 6-fach Steckdosenleiste..."
    },
    {
      "type": "paragraph",
      "content": "Der Durchschnittspreis liegt bei 21,82 €."
    },
    {
      "type": "button",
      "content": "4,6 von 5 Sterne aus 4.051 Bewertungen",
      "attrs": { "href": "https://forward.sparhamster.at/..." }
    }
  ]
}
```

---

### 4.3 商家识别与联盟占位

#### 商家识别策略

**输入来源** (按优先级):

1. **从 WordPress Tags 提取** (当前已实现: sparhamster-api-fetcher.ts:188-193):
   ```typescript
   // 查找首字母大写的 tag (通常是商家名)
   private extractMerchantName(post: WordPressPost): string | undefined {
     const tags = post._embedded?.['wp:term']?.[1]  // tags 在索引 1
     if (!tags) return undefined
     const capitalized = tags.find((tag) => /^[A-Z][A-Za-z0-9]+/.test(tag.name))
     return capitalized?.name  // 如 "Amazon", "MediaMarkt"
   }
   ```

2. **从内容中的商家链接域名提取** (当前已实现: sparhamster-api-fetcher.ts:289-307):
   ```typescript
   // 检测已知电商域名
   const merchantDomains = [
     'amazon.',
     'mediamarkt.',
     'saturn.',
     'otto.',
     'ebay.',
     'alternate.',
     'notebooksbilliger.'
   ]
   // 从链接 href 中匹配
   ```

3. **从商家 Logo 图片提取** (需新增):
   ```typescript
   private extractMerchantLogo(content: string): string | null {
     const $ = cheerio.load(content)

     // Sparhamster 商家 logo 特征:
     // <img src="https://www.sparhamster.at/wp-content/uploads/images/shops/1.png"
     //      alt="Amazon Gutscheine & Angebote">

     // 策略1: 查找 /images/shops/ 路径的图片
     const shopLogos = $('img[src*="/images/shops/"]')
     if (shopLogos.length > 0) {
       const src = $(shopLogos[0]).attr('src')
       const alt = $(shopLogos[0]).attr('alt')  // alt 通常包含商家名
       return src
     }

     // 策略2: 查找特定 class (如 .merchant-logo)
     const logoByClass = $('.merchant-logo, .shop-logo').first()
     if (logoByClass.length) {
       return logoByClass.attr('src')
     }

     return null
   }
   ```

4. **Logo → Merchant 映射表** (需新增):
   ```typescript
   // 配置文件: packages/worker/config/merchant-mapping.json
   {
     "logoUrlPatterns": {
       "/shops/1.png": "Amazon",
       "/shops/2.png": "MediaMarkt",
       "/shops/3.png": "Saturn",
       "/shops/4.png": "eBay"
       // ... 更多映射
     },
     "domainMapping": {
       "amazon.": "Amazon",
       "mediamarkt.": "MediaMarkt",
       "saturn.": "Saturn"
     }
   }

   // 使用:
   class MerchantResolver {
     private mapping: MerchantMapping

     resolve(logoUrl?: string, domain?: string, tagName?: string): string | null {
       // 优先级: tagName > logoUrl > domain
       if (tagName && this.isValidMerchant(tagName)) {
         return tagName
       }

       if (logoUrl) {
         for (const [pattern, merchant] of Object.entries(this.mapping.logoUrlPatterns)) {
           if (logoUrl.includes(pattern)) {
             return merchant
           }
         }
       }

       if (domain) {
         for (const [pattern, merchant] of Object.entries(this.mapping.domainMapping)) {
           if (domain.includes(pattern)) {
             return merchant
           }
         }
       }

       return null
     }
   }
   ```

#### 联盟链接占位方案

**数据库字段** (STEP3 定义):
```sql
ALTER TABLE deals ADD COLUMN affiliate_link TEXT;
ALTER TABLE deals ADD COLUMN affiliate_enabled BOOLEAN DEFAULT false;
ALTER TABLE deals ADD COLUMN affiliate_network VARCHAR(50);  -- 'amazon', 'awin', 'tradedoubler'
```

**占位逻辑** (阶段二实现):
```typescript
class AffiliatePreparation {
  prepare(deal: NormalizedDeal): AffiliateMetadata {
    const merchant = deal.merchant

    // 检查商家是否在白名单
    const isWhitelisted = AFFILIATE_WHITELIST.includes(merchant)

    if (!isWhitelisted) {
      return {
        affiliateEnabled: false,
        affiliateLink: null,
        affiliateNetwork: null
      }
    }

    // 占位: 保留原始链接,标记为待处理
    return {
      affiliateEnabled: true,           // 标记为启用
      affiliateLink: deal.merchantLink, // 暂时使用原始链接
      affiliateNetwork: this.detectNetwork(merchant),
      needsProcessing: true             // 阶段三处理
    }
  }

  private detectNetwork(merchant: string): string | null {
    const networkMapping: Record<string, string> = {
      'Amazon': 'amazon',
      'MediaMarkt': 'awin',
      'Saturn': 'awin',
      'eBay': 'ebay-partner'
    }
    return networkMapping[merchant] || null
  }
}
```

**配置** (环境变量):
```bash
# 阶段二: 仅标记,不替换
AFFILIATE_ENABLED=false
AFFILIATE_WHITELIST=Amazon,MediaMarkt,Saturn,eBay

# 阶段三: 启用替换
AFFILIATE_ENABLED=true
AMAZON_AFFILIATE_TAG=moreyudeals-21
AWIN_PUBLISHER_ID=123456
```

---

### 4.4 去重与版本控制

#### Hash 计算

**内容 Hash 策略**:
```typescript
import crypto from 'crypto'

class ContentHasher {
  /**
   * 计算内容的 SHA-256 hash
   * 基于: title + description + price + merchant
   * 不包含: publishedAt, images (可能变化但内容相同)
   */
  computeHash(deal: NormalizedDeal): string {
    const canonicalContent = [
      deal.title.toLowerCase().trim(),
      deal.description.toLowerCase().trim(),
      deal.price?.toString() || '',
      deal.merchant || '',
      deal.couponCode || ''
    ].join('|')

    return crypto
      .createHash('sha256')
      .update(canonicalContent, 'utf8')
      .digest('hex')
      .substring(0, 16)  // 取前 16 位即可
  }
}
```

**为什么用 Hash 而不是 GUID?**
- ✅ GUID (post link) 可能相同但内容更新 (如价格变化)
- ✅ Hash 能检测实质性内容变化
- ✅ 避免重复发布相同优惠

#### 重复判断逻辑

**数据库查询**:
```typescript
class Deduper {
  async checkDuplicate(deal: NormalizedDeal): Promise<DedupeResult> {
    const hash = this.hasher.computeHash(deal)

    // 查询相同 hash 的记录 (最近 7 天内)
    const existing = await this.db.query(`
      SELECT id, content_hash, duplicate_count, first_seen_at, last_seen_at
      FROM deals
      WHERE content_hash = $1
        AND first_seen_at > NOW() - INTERVAL '7 days'
      LIMIT 1
    `, [hash])

    if (existing) {
      return {
        isDuplicate: true,
        action: 'update',
        existingId: existing.id,
        duplicateCount: existing.duplicate_count
      }
    }

    return {
      isDuplicate: false,
      action: 'insert',
      hash
    }
  }
}
```

#### 更新 vs 忽略策略

**决策表**:

| 场景 | Hash 匹配? | 价格变化? | 操作 |
|------|-----------|----------|------|
| 全新优惠 | 否 | - | INSERT 新记录 |
| 完全相同 | 是 | 否 | UPDATE last_seen_at, duplicate_count++ |
| 内容更新 | 否 | - | INSERT 新记录 (新 hash) |
| 价格变化 | 否 | 是 | INSERT 新记录 (hash 包含 price) |

**更新逻辑**:
```typescript
async handleDuplicate(dealId: string): Promise<void> {
  await this.db.query(`
    UPDATE deals
    SET
      last_seen_at = NOW(),
      duplicate_count = duplicate_count + 1,
      updated_at = NOW()
    WHERE id = $1
  `, [dealId])

  logger.info('Duplicate deal updated', { dealId })
}
```

#### 保留历史的方式

**方案1: 单表版本控制** (推荐):
```sql
CREATE TABLE deals (
  id UUID PRIMARY KEY,
  content_hash VARCHAR(16) NOT NULL,

  -- 版本控制字段
  duplicate_count INT DEFAULT 0,        -- 重复次数
  first_seen_at TIMESTAMP NOT NULL,     -- 首次发现
  last_seen_at TIMESTAMP NOT NULL,      -- 最后一次发现

  -- ... 其他字段

  INDEX idx_content_hash (content_hash),
  INDEX idx_first_seen_at (first_seen_at DESC)
);
```

**方案2: 历史表** (可选,用于审计):
```sql
CREATE TABLE deals_history (
  id UUID PRIMARY KEY,
  deal_id UUID REFERENCES deals(id),
  snapshot JSONB NOT NULL,              -- 完整快照
  created_at TIMESTAMP DEFAULT NOW()
);

-- 每次更新时插入历史记录
INSERT INTO deals_history (deal_id, snapshot)
VALUES ($1, $2::jsonb);
```

**清理策略**:
```typescript
// 定期清理 >30 天的重复记录
async cleanupOldDuplicates(): Promise<void> {
  await this.db.query(`
    DELETE FROM deals
    WHERE duplicate_count > 0
      AND last_seen_at < NOW() - INTERVAL '30 days'
  `)
}
```

---

### 4.5 翻译任务

#### 批量创建

**当前流程** (单个翻译):
```typescript
// packages/worker/src/translation-worker.ts
// 逐个创建 translation_jobs
```

**改进后 (批量创建)**:
```typescript
class TranslationJobCreator {
  async createBatchJobs(deals: NormalizedDeal[]): Promise<void> {
    const jobs: TranslationJob[] = []

    for (const deal of deals) {
      // 为每个 deal 创建多个任务 (title, description, content_blocks)
      jobs.push({
        itemId: deal.id,
        type: 'title',
        originalText: deal.title,
        sourceLanguage: 'de',
        targetLanguage: 'zh',
        status: 'pending'
      })

      jobs.push({
        itemId: deal.id,
        type: 'description',
        originalText: deal.description,
        sourceLanguage: 'de',
        targetLanguage: 'zh',
        status: 'pending'
      })

      // content_blocks: 批量翻译所有文本块
      const textBlocks = deal.contentBlocks
        .filter(b => b.type === 'paragraph' || b.type === 'heading')
        .map(b => b.content as string)

      if (textBlocks.length > 0) {
        jobs.push({
          itemId: deal.id,
          type: 'content_blocks',
          originalText: JSON.stringify(textBlocks),  // 序列化为 JSON
          sourceLanguage: 'de',
          targetLanguage: 'zh',
          status: 'pending'
        })
      }
    }

    // 批量插入数据库
    await this.db.batchInsertJobs(jobs)
  }
}
```

#### 字段粒度

**翻译字段清单**:

| 字段 | 类型 | 优先级 | 说明 |
|------|------|--------|------|
| `title` | string | P0 | 标题,必须翻译 |
| `description` | string | P0 | 摘要,必须翻译 |
| `contentBlocks[*].content` | string[] | P1 | 正文段落/标题 |
| `merchant` | string | P2 | 商家名 (可选,如 "Amazon" 保持不变) |
| `categories[*]` | string[] | P2 | 分类名称 |

**不翻译的字段**:
- ❌ `price`, `discount`, `currency` (数字/符号)
- ❌ `couponCode` (代码通常不翻译)
- ❌ `links`, `images` (URL)

#### 多 Provider 降级流程

**当前实现** (仅 DeepL):
```typescript
// packages/translation/index.ts
// 仅使用 DeepL API
```

**改进后 (降级链)**:
```typescript
class TranslationManager {
  private providers: TranslationProvider[] = [
    new DeepLProvider(config.deepl),
    // 未来扩展:
    // new AzureTranslator(config.azure),
    // new GoogleTranslate(config.google)
  ]

  async translate(text: string, from: string, to: string): Promise<string> {
    let lastError: Error

    for (const provider of this.providers) {
      try {
        const result = await provider.translate(text, from, to)
        logger.info('Translation succeeded', { provider: provider.name })
        return result
      } catch (error) {
        lastError = error as Error
        logger.warn(`${provider.name} failed, trying next`, { error })

        // 如果是配额耗尽,跳过当前 provider
        if (this.isQuotaError(error)) {
          continue
        }

        // 其他错误也尝试下一个
        continue
      }
    }

    throw new Error(`All translation providers failed: ${lastError.message}`)
  }

  private isQuotaError(error: any): boolean {
    return (
      error.message?.includes('quota') ||
      error.message?.includes('limit exceeded') ||
      error.response?.status === 429
    )
  }
}
```

#### 缓存使用

**当前实现** (Redis 缓存):
```typescript
// packages/translation/index.ts
// 已有 Redis 缓存机制
```

**优化建议**:
```typescript
class TranslationCache {
  private redis: Redis
  private ttl = 30 * 24 * 60 * 60  // 30 天

  // Key 格式: "trans:de:zh:hash"
  private getCacheKey(text: string, from: string, to: string): string {
    const hash = crypto.createHash('md5').update(text).digest('hex').substring(0, 8)
    return `trans:${from}:${to}:${hash}`
  }

  async get(text: string, from: string, to: string): Promise<string | null> {
    const key = this.getCacheKey(text, from, to)
    return await this.redis.get(key)
  }

  async set(text: string, from: string, to: string, translation: string): Promise<void> {
    const key = this.getCacheKey(text, from, to)
    await this.redis.setex(key, this.ttl, translation)
  }

  // 批量查询 (管道)
  async getBatch(texts: string[], from: string, to: string): Promise<(string | null)[]> {
    const keys = texts.map(t => this.getCacheKey(t, from, to))
    const pipeline = this.redis.pipeline()
    keys.forEach(key => pipeline.get(key))
    const results = await pipeline.exec()
    return results.map(r => r[1] as string | null)
  }
}
```

**配额统计** (新增):
```typescript
class QuotaTracker {
  async recordUsage(provider: string, charCount: number): Promise<void> {
    const key = `quota:${provider}:${this.getCurrentMonth()}`
    await this.redis.incrby(key, charCount)
    await this.redis.expire(key, 31 * 24 * 60 * 60)  // 保留 31 天
  }

  async getCurrentUsage(provider: string): Promise<number> {
    const key = `quota:${provider}:${this.getCurrentMonth()}`
    const usage = await this.redis.get(key)
    return parseInt(usage || '0')
  }

  private getCurrentMonth(): string {
    return new Date().toISOString().substring(0, 7)  // "2025-10"
  }
}
```

---

### 4.6 Scheduler (调度器)

#### 随机间隔算法

**当前实现** (packages/worker/src/index.ts:84-103):
```typescript
// 固定间隔 (每30分钟) + 随机延迟 (0-5分钟)
const cronPattern = `0 */${this.config.fetchInterval} * * * *`
this.fetchJob = new CronJob(cronPattern, async () => {
  const randomDelay = Math.floor(Math.random() * 5 * 60 * 1000)
  await new Promise(resolve => setTimeout(resolve, randomDelay))
  await this.fetchLatestDeals()
})
```

**问题**: 所有任务仍在同一时间窗口触发 (如 00:00-00:05, 00:30-00:35)

**改进后 (真随机)**:
```typescript
class RandomScheduler {
  private minInterval: number  // 5 分钟 (秒)
  private maxInterval: number  // 15 分钟 (秒)
  private timer?: NodeJS.Timeout
  private isRunning = false

  constructor(config: SchedulerConfig) {
    this.minInterval = config.minInterval * 1000  // 转毫秒
    this.maxInterval = config.maxInterval * 1000
  }

  start(): void {
    this.isRunning = true
    this.scheduleNext()
  }

  stop(): void {
    this.isRunning = false
    if (this.timer) {
      clearTimeout(this.timer)
    }
  }

  private scheduleNext(): void {
    if (!this.isRunning) return

    // 计算随机间隔
    const interval = this.getRandomInterval()
    const nextRunTime = new Date(Date.now() + interval)

    logger.info('Next fetch scheduled', {
      interval: `${Math.round(interval / 1000 / 60)} minutes`,
      nextRunTime: nextRunTime.toISOString()
    })

    this.timer = setTimeout(async () => {
      try {
        await this.executeFetch()
      } catch (error) {
        logger.error('Fetch failed', { error })
      } finally {
        // 无论成功失败,都调度下一次
        this.scheduleNext()
      }
    }, interval)
  }

  private getRandomInterval(): number {
    // 均匀分布随机数
    return Math.floor(
      Math.random() * (this.maxInterval - this.minInterval + 1) + this.minInterval
    )
  }

  private async executeFetch(): Promise<void> {
    const startTime = Date.now()
    logger.info('Starting scheduled fetch')

    const result = await this.fetcher.fetchLatest()

    logger.info('Fetch completed', {
      duration: Date.now() - startTime,
      inserted: result.inserted,
      updated: result.updated,
      errors: result.errors.length
    })
  }
}
```

**配置**:
```bash
SPARHAMSTER_FETCH_INTERVAL_MIN=300   # 5 分钟
SPARHAMSTER_FETCH_INTERVAL_MAX=900   # 15 分钟
```

#### 任务排队/锁

**防止并发执行**:
```typescript
class TaskLock {
  private locks = new Map<string, boolean>()

  async acquire(key: string, timeout: number = 60000): Promise<boolean> {
    if (this.locks.get(key)) {
      logger.warn('Task already running', { key })
      return false
    }

    this.locks.set(key, true)

    // 自动释放 (防止死锁)
    setTimeout(() => {
      this.release(key)
      logger.warn('Lock auto-released', { key })
    }, timeout)

    return true
  }

  release(key: string): void {
    this.locks.delete(key)
  }
}

// 使用:
async executeFetch(): Promise<void> {
  const lockKey = 'sparhamster-fetch'
  if (!await this.lock.acquire(lockKey, 120000)) {  // 2 分钟超时
    return  // 跳过本次执行
  }

  try {
    await this.fetcher.fetchLatest()
  } finally {
    this.lock.release(lockKey)
  }
}
```

#### 失败重试规则

**错误分类与处理**:

| 错误类型 | 重试? | 策略 |
|----------|-------|------|
| 网络超时 | 是 | 1分钟后重试,最多 3 次 |
| 429 限流 | 是 | 等待 Retry-After,最长 30 分钟 |
| 5xx 服务器错误 | 是 | 指数退避,最多 3 次 |
| 4xx 客户端错误 | 否 | 记录日志,跳过 |
| 解析错误 | 否 | 记录原始响应,跳过 |

**实现**:
```typescript
class SchedulerWithRetry extends RandomScheduler {
  private retryCount = 0
  private maxRetries = 3

  private async executeFetch(): Promise<void> {
    try {
      await super.executeFetch()
      this.retryCount = 0  // 成功后重置
    } catch (error) {
      if (this.shouldRetry(error) && this.retryCount < this.maxRetries) {
        this.retryCount++
        const delay = this.getRetryDelay(this.retryCount)
        logger.warn(`Fetch failed, retrying in ${delay}ms`, {
          attempt: this.retryCount,
          error
        })

        // 短暂延迟后重试
        setTimeout(() => this.executeFetch(), delay)
      } else {
        logger.error('Fetch failed after max retries', { error })
        this.retryCount = 0  // 重置,等待下一次正常调度
      }
    }
  }

  private getRetryDelay(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt - 1), 60000)  // 1s, 2s, 4s (最大 1 分钟)
  }

  private shouldRetry(error: any): boolean {
    return (
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNRESET' ||
      (error.response?.status >= 500 && error.response?.status < 600) ||
      error.response?.status === 429
    )
  }
}
```

#### 优雅停机流程

**当前实现** (packages/worker/src/index.ts:130-152):
```typescript
private setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    console.log(`收到${signal}信号，开始优雅关闭...`)

    if (this.fetchJob) {
      this.fetchJob.stop()
    }

    await this.database.close()
    process.exit(0)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}
```

**改进建议**:
```typescript
class GracefulShutdown {
  private isShuttingDown = false
  private activeRequests = 0

  async shutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) return
    this.isShuttingDown = true

    logger.info(`Received ${signal}, starting graceful shutdown...`)

    // 1. 停止接受新任务
    this.scheduler.stop()

    // 2. 等待正在执行的任务完成 (最长 30 秒)
    const startTime = Date.now()
    while (this.activeRequests > 0) {
      if (Date.now() - startTime > 30000) {
        logger.warn('Shutdown timeout, forcing exit', {
          activeRequests: this.activeRequests
        })
        break
      }
      await sleep(1000)
    }

    // 3. 关闭数据库连接
    await this.database.close()

    // 4. 关闭 Redis 连接
    await this.redis.quit()

    logger.info('Shutdown complete')
    process.exit(0)
  }

  incrementRequests(): void {
    this.activeRequests++
  }

  decrementRequests(): void {
    this.activeRequests--
  }
}
```

---

### 4.7 数据库交互

#### 所需新表或字段

**详细设计见 STEP3**,此处列出关键项:

**新字段** (在 STEP3 迁移脚本中添加):
```sql
-- deals 表新增字段
ALTER TABLE deals ADD COLUMN source_site VARCHAR(50) DEFAULT 'sparhamster';
ALTER TABLE deals ADD COLUMN source_post_id VARCHAR(100);
ALTER TABLE deals ADD COLUMN content_hash VARCHAR(16);
ALTER TABLE deals ADD COLUMN content_blocks JSONB;
ALTER TABLE deals ADD COLUMN merchant VARCHAR(255);
ALTER TABLE deals ADD COLUMN merchant_logo TEXT;
ALTER TABLE deals ADD COLUMN affiliate_link TEXT;
ALTER TABLE deals ADD COLUMN affiliate_enabled BOOLEAN DEFAULT false;
ALTER TABLE deals ADD COLUMN coupon_code VARCHAR(100);
ALTER TABLE deals ADD COLUMN currency VARCHAR(3) DEFAULT 'EUR';
ALTER TABLE deals ADD COLUMN expires_at TIMESTAMP;
ALTER TABLE deals ADD COLUMN raw_payload JSONB;
ALTER TABLE deals ADD COLUMN duplicate_count INT DEFAULT 0;
ALTER TABLE deals ADD COLUMN first_seen_at TIMESTAMP;
ALTER TABLE deals ADD COLUMN last_seen_at TIMESTAMP;

-- 索引
CREATE INDEX idx_deals_content_hash ON deals(content_hash);
CREATE INDEX idx_deals_merchant ON deals(merchant);
CREATE INDEX idx_deals_first_seen_at ON deals(first_seen_at DESC);
```

**新表** (可选):
```sql
-- 商家配置表
CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  logo_url TEXT,
  affiliate_network VARCHAR(50),
  affiliate_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Logo 映射表
CREATE TABLE merchant_logo_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_pattern VARCHAR(500) NOT NULL,
  merchant_id UUID REFERENCES merchants(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 读写流程

**写入流程** (Upsert 逻辑):
```typescript
class DatabaseManager {
  async upsertDeal(deal: NormalizedDeal): Promise<'inserted' | 'updated'> {
    const hash = this.hasher.computeHash(deal)

    // 查询是否存在相同 hash
    const existing = await this.checkDuplicate(hash)

    if (existing) {
      // 更新现有记录
      await this.query(`
        UPDATE deals
        SET
          last_seen_at = NOW(),
          duplicate_count = duplicate_count + 1,
          updated_at = NOW()
        WHERE id = $1
      `, [existing.id])

      return 'updated'
    }

    // 插入新记录
    await this.query(`
      INSERT INTO deals (
        source_site, source_post_id, guid, slug,
        title, description, content_blocks,
        merchant, merchant_logo, merchant_link,
        price, original_price, discount, currency, coupon_code,
        categories, tags,
        published_at, expires_at,
        content_hash, first_seen_at, last_seen_at,
        raw_payload, language,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, NOW(), NOW(), $21, $22, NOW(), NOW()
      )
    `, [
      deal.sourceSite,
      deal.sourcePostId,
      deal.guid,
      deal.slug,
      deal.title,
      deal.description,
      JSON.stringify(deal.contentBlocks),
      deal.merchant,
      deal.merchantLogo,
      deal.merchantLink,
      deal.price,
      deal.originalPrice,
      deal.discount,
      deal.currency,
      deal.couponCode,
      JSON.stringify(deal.categories),
      JSON.stringify(deal.tags),
      deal.publishedAt,
      deal.expiresAt,
      hash,
      JSON.stringify(deal),  // raw_payload
      deal.language
    ])

    return 'inserted'
  }
}
```

**读取流程** (翻译任务查询):
```typescript
async getPendingTranslations(limit: number = 10): Promise<TranslationJob[]> {
  return await this.query(`
    SELECT * FROM translation_jobs
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT $1
  `, [limit])
}
```

#### 事务与回滚要求

**事务包裹**:
```typescript
async processBatch(deals: NormalizedDeal[]): Promise<void> {
  const client = await this.pool.connect()

  try {
    await client.query('BEGIN')

    for (const deal of deals) {
      const action = await this.upsertDeal(deal)

      if (action === 'inserted') {
        // 创建翻译任务
        await this.createTranslationJobs(deal.id)
      }
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    logger.error('Batch processing failed, rolled back', { error })
    throw error
  } finally {
    client.release()
  }
}
```

**回滚场景**:
1. 数据插入失败 → 回滚整个批次
2. 翻译任务创建失败 → 回滚 deal 插入
3. 外键约束违反 → 回滚并记录日志

#### 迁移依赖

**前置条件** (STEP3 必须先完成):
- [ ] 001_create_deals_table.sql
- [ ] 002_add_merchant_fields.sql
- [ ] 003_add_content_blocks.sql
- [ ] 004_add_dedup_fields.sql

**Worker 代码依赖迁移**:
```typescript
// 启动前检查 schema 版本
async checkSchemaVersion(): Promise<void> {
  const result = await this.query(`
    SELECT version FROM schema_migrations
    ORDER BY applied_at DESC
    LIMIT 1
  `)

  const currentVersion = result.rows[0]?.version || 0
  const requiredVersion = 4  // 需要迁移 004

  if (currentVersion < requiredVersion) {
    throw new Error(
      `Database schema outdated. Required: ${requiredVersion}, Current: ${currentVersion}`
    )
  }
}
```

---

### 4.8 日志与监控

#### 日志结构

**日志级别**:
- `debug`: 详细调试信息 (开发环境)
- `info`: 常规操作日志
- `warn`: 警告 (不影响功能)
- `error`: 错误 (需要关注)
- `fatal`: 严重错误 (服务停止)

**结构化日志** (JSON 格式):
```typescript
interface LogEntry {
  timestamp: string           // ISO 8601
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  module: string              // 'scheduler' | 'fetcher' | 'translator' | 'database'
  message: string
  context?: Record<string, any>  // 附加上下文
  error?: {
    name: string
    message: string
    stack?: string
  }
}

// 示例:
logger.info('Fetch completed', {
  duration: 3452,
  inserted: 15,
  updated: 3,
  errors: 0
})

// 输出:
{
  "timestamp": "2025-10-12T19:00:00.000Z",
  "level": "info",
  "module": "fetcher",
  "message": "Fetch completed",
  "context": {
    "duration": 3452,
    "inserted": 15,
    "updated": 3,
    "errors": 0
  }
}
```

**关键日志点**:

| 事件 | 级别 | 消息 | 上下文 |
|------|------|------|--------|
| Worker 启动 | info | "Worker service started" | { version, config } |
| 调度触发 | info | "Fetch scheduled" | { nextRunTime, interval } |
| API 请求开始 | debug | "Fetching from API" | { url, params } |
| API 请求完成 | info | "Fetch completed" | { duration, count } |
| API 请求失败 | error | "Fetch failed" | { error, attempt } |
| 去重检查 | debug | "Duplicate check" | { hash, isDuplicate } |
| 记录插入 | info | "Deal inserted" | { dealId, title } |
| 记录更新 | info | "Deal updated" | { dealId, duplicateCount } |
| 翻译任务创建 | info | "Translation jobs created" | { dealId, jobCount } |
| 翻译完成 | info | "Translation completed" | { jobId, provider, duration } |
| 翻译失败 | warn | "Translation failed" | { jobId, error, retryCount } |
| 配额警告 | warn | "Quota threshold reached" | { provider, usage, limit } |
| 数据库错误 | error | "Database operation failed" | { operation, error } |
| Worker 停止 | info | "Worker shutdown" | { reason, uptime } |

#### 指标 (Metrics)

**性能指标**:
```typescript
interface WorkerMetrics {
  // 抓取指标
  fetch: {
    totalRuns: number
    successRate: number
    avgDuration: number
    lastRunAt: Date
  }

  // 数据指标
  data: {
    totalDeals: number
    newDealsToday: number
    duplicatesToday: number
    avgDuplicateCount: number
  }

  // 翻译指标
  translation: {
    pendingJobs: number
    completedToday: number
    failedToday: number
    avgDuration: number
    quotaUsed: {
      deepl: number      // 字符数
      // azure: number
    }
  }

  // 系统指标
  system: {
    uptime: number
    memoryUsage: number
    cpuUsage: number
  }
}
```

**指标收集**:
```typescript
class MetricsCollector {
  private metrics: WorkerMetrics = this.initMetrics()

  recordFetchRun(duration: number, success: boolean): void {
    this.metrics.fetch.totalRuns++
    if (success) {
      this.metrics.fetch.avgDuration =
        (this.metrics.fetch.avgDuration + duration) / 2
    }
    this.metrics.fetch.lastRunAt = new Date()
  }

  recordDealInserted(): void {
    this.metrics.data.totalDeals++
    this.metrics.data.newDealsToday++
  }

  recordDuplicate(): void {
    this.metrics.data.duplicatesToday++
  }

  recordTranslation(provider: string, charCount: number): void {
    this.metrics.translation.completedToday++
    this.metrics.translation.quotaUsed[provider] += charCount
  }

  // 暴露指标端点 (可选)
  getMetrics(): WorkerMetrics {
    return { ...this.metrics }
  }
}
```

**指标导出** (可选):
```typescript
// HTTP 端点 (用于 Prometheus 抓取)
app.get('/metrics', (req, res) => {
  const metrics = metricsCollector.getMetrics()

  // Prometheus 格式
  res.type('text/plain')
  res.send(`
# HELP worker_fetch_total Total number of fetch runs
# TYPE worker_fetch_total counter
worker_fetch_total ${metrics.fetch.totalRuns}

# HELP worker_deals_total Total number of deals
# TYPE worker_deals_total gauge
worker_deals_total ${metrics.data.totalDeals}

# HELP worker_translation_quota_used Translation quota used (characters)
# TYPE worker_translation_quota_used gauge
worker_translation_quota_used{provider="deepl"} ${metrics.translation.quotaUsed.deepl}
  `)
})
```

#### 异常告警预案

**告警规则**:

| 条件 | 级别 | 通知方式 | 响应时间 |
|------|------|----------|----------|
| 连续 3 次抓取失败 | P1 | Email + Slack | 15 分钟内 |
| 403/401 错误 (被封禁) | P0 | 立即通知 | 5 分钟内 |
| DeepL 配额 >80% | P2 | Email | 1 小时内 |
| 翻译失败率 >10% | P2 | Email | 1 小时内 |
| 数据库连接失败 | P0 | 立即通知 | 5 分钟内 |
| 内存使用 >90% | P1 | Email | 15 分钟内 |

**告警实现** (简化版):
```typescript
class AlertManager {
  private consecutiveFailures = 0

  async checkAndAlert(): Promise<void> {
    const metrics = this.metricsCollector.getMetrics()

    // 检查连续失败
    if (this.consecutiveFailures >= 3) {
      await this.sendAlert('P1', 'Consecutive fetch failures', {
        count: this.consecutiveFailures
      })
    }

    // 检查配额
    const deeplUsage = metrics.translation.quotaUsed.deepl
    const deeplLimit = 500000  // 500k 字符/月
    if (deeplUsage > deeplLimit * 0.8) {
      await this.sendAlert('P2', 'DeepL quota threshold', {
        usage: deeplUsage,
        limit: deeplLimit,
        percentage: (deeplUsage / deeplLimit * 100).toFixed(1)
      })
    }

    // 检查翻译失败率
    const totalTranslations = metrics.translation.completedToday + metrics.translation.failedToday
    const failureRate = metrics.translation.failedToday / totalTranslations
    if (failureRate > 0.1) {
      await this.sendAlert('P2', 'High translation failure rate', {
        failureRate: (failureRate * 100).toFixed(1) + '%'
      })
    }
  }

  private async sendAlert(priority: string, message: string, context: any): Promise<void> {
    // 实现: Email / Slack / PagerDuty / 其他
    logger.error(`ALERT [${priority}]: ${message}`, context)

    // 示例: 发送 Email
    // await this.emailService.send({
    //   to: 'alerts@moreyudeals.com',
    //   subject: `[${priority}] Worker Alert: ${message}`,
    //   body: JSON.stringify(context, null, 2)
    // })
  }
}
```

---

### 4.9 配置与环境变量

#### 新增/修改的变量

**完整清单**:

```bash
# ============================================
# Sparhamster API 配置
# ============================================
SPARHAMSTER_API_URL=https://www.sparhamster.at/wp-json/wp/v2/posts
SPARHAMSTER_API_LIMIT=40                      # 每次抓取数量 (已有变量,范围: 10-100)
SPARHAMSTER_FETCH_INTERVAL_MIN=300            # 最小间隔 (秒, 默认 5 分钟) - 新增
SPARHAMSTER_FETCH_INTERVAL_MAX=900            # 最大间隔 (秒, 默认 15 分钟) - 新增
SPARHAMSTER_FEED_ID=sparhamster-api           # 数据源标识

# ============================================
# Worker 调度配置
# ============================================
WORKER_RANDOM_DELAY_ENABLED=true              # 启用随机间隔
WORKER_MAX_RETRIES=3                          # 最大重试次数
WORKER_RETRY_BASE_DELAY=60000                 # 重试基础延迟 (毫秒, 1 分钟)
WORKER_DEDUP_WINDOW_HOURS=168                 # 去重窗口 (小时, 默认 7 天)
WORKER_CLEANUP_OLD_DUPLICATES=true            # 定期清理旧重复记录
WORKER_CLEANUP_INTERVAL_DAYS=30               # 清理间隔 (天)

# ============================================
# 防封禁策略
# ============================================
WORKER_USER_AGENT_ROTATION=true               # 启用 User-Agent 轮换
WORKER_MIN_REQUEST_INTERVAL=3000              # 最小请求间隔 (毫秒, 3 秒)
WORKER_REQUEST_TIMEOUT=15000                  # 请求超时 (毫秒, 15 秒)

# ============================================
# 翻译配置
# ============================================
TRANSLATION_ENABLED=true
TRANSLATION_TARGET_LANGUAGES=zh,en            # 目标语言
TRANSLATION_BATCH_SIZE=10                     # 批量翻译大小
TRANSLATION_PROVIDERS=deepl                   # 翻译服务 (逗号分隔)
TRANSLATION_CACHE_TTL=2592000                 # 缓存有效期 (秒, 30 天)

# DeepL 配置
DEEPL_API_KEY=<key>
DEEPL_ENDPOINT=https://api-free.deepl.com/v2
DEEPL_MONTHLY_QUOTA=500000                    # 每月配额 (字符数)

# 未来扩展: Azure Translator
# AZURE_TRANSLATOR_KEY=<key>
# AZURE_TRANSLATOR_REGION=<region>
# AZURE_MONTHLY_QUOTA=2000000

# ============================================
# 商家识别配置
# ============================================
MERCHANT_LOGO_MAPPING_FILE=config/merchant-mapping.json
MERCHANT_WHITELIST=Amazon,MediaMarkt,Saturn,eBay

# ============================================
# 联盟链接配置 (阶段三启用)
# ============================================
AFFILIATE_ENABLED=false                       # 阶段二: 保持 false
AMAZON_AFFILIATE_TAG=                         # 空 (阶段三填写)

# ============================================
# 数据库配置 (保持不变)
# ============================================
DB_HOST=43.157.22.182
DB_PORT=5432
DB_NAME=moreyudeals
DB_USER=moreyu_admin
DB_PASSWORD=<secret>
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=10

# ============================================
# Redis 配置 (保持不变)
# ============================================
REDIS_URL=redis://localhost:6379
REDIS_KEY_PREFIX=moreyudeals:

# ============================================
# 日志与监控
# ============================================
LOG_LEVEL=info                                # debug | info | warn | error | fatal
LOG_FORMAT=json                               # json | text
METRICS_ENABLED=true
METRICS_PORT=9090                             # Prometheus 指标端点

# ============================================
# 告警配置
# ============================================
ALERT_EMAIL=alerts@moreyudeals.com
ALERT_SLACK_WEBHOOK=<webhook-url>
```

#### 默认值与范围

**验证规则**:
```typescript
interface ConfigValidation {
  SPARHAMSTER_API_LIMIT: {        // 使用已有变量名
    min: 10
    max: 100
    default: 40
  }
  SPARHAMSTER_FETCH_INTERVAL_MIN: {
    min: 60          // 至少 1 分钟
    max: 3600        // 最多 1 小时
    default: 300     // 5 分钟
  }
  SPARHAMSTER_FETCH_INTERVAL_MAX: {
    min: 300         // 至少 5 分钟
    max: 7200        // 最多 2 小时
    default: 900     // 15 分钟
  }
  WORKER_MAX_RETRIES: {
    min: 0
    max: 10
    default: 3
  }
  TRANSLATION_BATCH_SIZE: {
    min: 1
    max: 50
    default: 10
  }
}

class ConfigValidator {
  validate(config: WorkerConfig): void {
    // 间隔范围检查
    if (config.fetchIntervalMin > config.fetchIntervalMax) {
      throw new Error('FETCH_INTERVAL_MIN must be <= FETCH_INTERVAL_MAX')
    }

    // 数值范围检查 (使用 apiLimit 而非 fetchLimit)
    if (config.apiLimit < 10 || config.apiLimit > 100) {
      throw new Error('API_LIMIT must be between 10 and 100')
    }

    // 必填项检查
    if (!config.database.password) {
      throw new Error('DB_PASSWORD is required')
    }

    if (config.translationEnabled && !config.deepl.apiKey) {
      throw new Error('DEEPL_API_KEY is required when translation is enabled')
    }
  }
}
```

---

## 五、安全与合规 (Security & Compliance)

### 5.1 防封禁策略

**综合防护措施**:

| 策略 | 实现方式 | 效果评估 |
|------|----------|----------|
| **随机间隔** | 5-15 分钟完全随机 | ✅ 高 - 无法预测抓取时间 |
| **User-Agent 轮换** | 3-5 个真实浏览器 UA | ✅ 中 - 模拟不同用户 |
| **Referer 设置** | 设置为源站主页 | ✅ 低 - 看起来像正常访问 |
| **请求间延迟** | 每条记录处理间隔 0.5-2 秒 | ✅ 高 - 避免突发请求 |
| **429 响应处理** | 遵守 Retry-After 头 | ✅ 必须 - 避免被永久封禁 |
| **Accept-Language** | 设置为 de-AT (奥地利德语) | ✅ 低 - 增加真实性 |

**实现检查清单**:
- [x] 已实现: 随机延迟 (sparhamster-api-fetcher.ts:44-47, 72-75)
- [x] 已实现: User-Agent 设置 (sparhamster-api-fetcher.ts:61) - 但仅单个 UA
- [ ] 待实现: User-Agent 轮换池 (从固定 UA 改为随机选择)
- [ ] 待实现: Referer 头
- [ ] 待实现: 429 错误特殊处理
- [ ] 待实现: Accept-Language 头

### 5.2 请求频率控制

**全局限流**:
```typescript
class GlobalRateLimiter {
  private requestLog: number[] = []  // 时间戳数组
  private readonly windowMs = 60000  // 1 分钟窗口
  private readonly maxRequests = 10  // 每分钟最多 10 次

  async checkLimit(): Promise<boolean> {
    const now = Date.now()

    // 清理过期记录
    this.requestLog = this.requestLog.filter(
      timestamp => now - timestamp < this.windowMs
    )

    // 检查是否超限
    if (this.requestLog.length >= this.maxRequests) {
      const oldestRequest = this.requestLog[0]
      const waitTime = this.windowMs - (now - oldestRequest)

      logger.warn('Rate limit reached, waiting', { waitTime })
      await sleep(waitTime)
    }

    // 记录本次请求
    this.requestLog.push(now)
    return true
  }
}
```

### 5.3 错误率阈值

**监控与熔断**:
```typescript
class ErrorRateMonitor {
  private recentRequests: Array<{ success: boolean; timestamp: number }> = []
  private readonly windowSize = 20  // 最近 20 次请求
  private readonly threshold = 0.5  // 50% 错误率

  recordRequest(success: boolean): void {
    this.recentRequests.push({ success, timestamp: Date.now() })

    // 保持窗口大小
    if (this.recentRequests.length > this.windowSize) {
      this.recentRequests.shift()
    }
  }

  shouldCircuitBreak(): boolean {
    if (this.recentRequests.length < 10) {
      return false  // 样本不足,不熔断
    }

    const failures = this.recentRequests.filter(r => !r.success).length
    const errorRate = failures / this.recentRequests.length

    if (errorRate > this.threshold) {
      logger.error('Circuit breaker triggered', {
        errorRate: (errorRate * 100).toFixed(1) + '%',
        failures,
        total: this.recentRequests.length
      })
      return true
    }

    return false
  }
}

// 使用:
if (this.errorMonitor.shouldCircuitBreak()) {
  logger.warn('Too many failures, pausing for 5 minutes')
  await sleep(5 * 60 * 1000)
  this.errorMonitor.reset()
}
```

### 5.4 敏感数据保护

**数据脱敏**:
```typescript
class SensitiveDataMasker {
  maskConfig(config: any): any {
    return {
      ...config,
      database: {
        ...config.database,
        password: '***'
      },
      deepl: {
        ...config.deepl,
        apiKey: this.maskKey(config.deepl.apiKey)
      }
    }
  }

  private maskKey(key: string): string {
    if (!key || key.length < 8) return '***'
    return key.substring(0, 4) + '***' + key.substring(key.length - 4)
  }
}

// 日志中使用:
logger.info('Worker started', {
  config: masker.maskConfig(this.config)
})
```

**原始数据存储**:
```typescript
// raw_payload 字段包含敏感信息时:
async storeRawPayload(deal: NormalizedDeal): Promise<void> {
  // 移除敏感字段
  const sanitized = {
    ...deal,
    // 不存储作者 email 等
  }

  await this.db.query(`
    UPDATE deals
    SET raw_payload = $1
    WHERE id = $2
  `, [JSON.stringify(sanitized), deal.id])
}
```

---

## 六、测试计划 (Testing Plan)

### 6.1 测试范围

**单元测试**:

| 模块 | 测试文件 | 覆盖内容 |
|------|----------|----------|
| Content Normalizer | `content-normalizer.spec.ts` | - HTML 清理<br>- 价格提取<br>- 商家识别<br>- ContentBlock 解析 |
| Content Hasher | `content-hasher.spec.ts` | - Hash 计算一致性<br>- 边界情况 (空字符串等) |
| Deduper | `deduper.spec.ts` | - 去重判断<br>- Hash 碰撞处理 |
| Scheduler | `scheduler.spec.ts` | - 随机间隔生成<br>- 任务锁机制 |
| Retry Strategy | `retry-strategy.spec.ts` | - 指数退避计算<br>- 可重试错误判断 |

**集成测试**:

| 场景 | 测试文件 | 测试步骤 |
|------|----------|----------|
| 完整抓取流程 | `worker-integration.spec.ts` | 1. Mock API 响应<br>2. 执行抓取<br>3. 验证数据库写入<br>4. 验证翻译任务创建 |
| 去重机制 | `deduplication.spec.ts` | 1. 插入记录<br>2. 重复抓取<br>3. 验证仅更新不重复插入 |
| 翻译流程 | `translation-pipeline.spec.ts` | 1. 创建翻译任务<br>2. 执行翻译<br>3. 验证结果写回 |

**端到端测试**:

| 场景 | 描述 | 验收标准 |
|------|------|----------|
| 冷启动 | 从空数据库启动 Worker | - 成功连接数据库<br>- 立即执行首次抓取<br>- 插入记录 >0 |
| 重复抓取 | 连续执行 2 次抓取 | - 第 2 次 inserted=0<br>- updated >0<br>- 无重复记录 |
| 错误恢复 | 模拟 API 503 错误 | - 触发重试<br>- 最终成功<br>- 日志包含重试记录 |
| 优雅停机 | 发送 SIGTERM 信号 | - 停止调度器<br>- 等待当前任务完成<br>- 关闭数据库连接 |

### 6.2 模拟 Sparhamster API

**Mock Server 实现**:
```typescript
// tests/mocks/sparhamster-mock-server.ts
import express from 'express'

class SparhamsterMockServer {
  private app = express()
  private server: any

  start(port: number = 9999): void {
    this.app.get('/wp-json/wp/v2/posts', (req, res) => {
      const perPage = parseInt(req.query.per_page as string) || 10

      const mockPosts = this.generateMockPosts(perPage)
      res.json(mockPosts)
    })

    // 模拟 429 错误
    this.app.get('/wp-json/wp/v2/posts/rate-limit', (req, res) => {
      res.status(429).json({ message: 'Too Many Requests' })
    })

    // 模拟 500 错误
    this.app.get('/wp-json/wp/v2/posts/error', (req, res) => {
      res.status(500).json({ message: 'Internal Server Error' })
    })

    this.server = this.app.listen(port)
  }

  stop(): void {
    this.server?.close()
  }

  private generateMockPosts(count: number): any[] {
    const posts = []
    for (let i = 0; i < count; i++) {
      posts.push({
        id: 100000 + i,
        date: new Date().toISOString(),
        title: { rendered: `Test Deal ${i}` },
        excerpt: { rendered: `This is test deal ${i}` },
        content: { rendered: `<p>Price: 19.99 €</p><p>Original: 29.99 €</p>` },
        link: `https://test.sparhamster.at/deal-${i}`,
        _embedded: {
          'wp:featuredmedia': [{
            source_url: `https://test.sparhamster.at/image-${i}.jpg`
          }],
          'wp:term': [[
            { id: 1, name: 'Electronics', slug: 'electronics' }
          ], [
            { id: 100, name: 'Amazon', slug: 'amazon' }
          ]]
        }
      })
    }
    return posts
  }
}

export const mockServer = new SparhamsterMockServer()
```

**测试使用**:
```typescript
// tests/worker-integration.spec.ts
describe('Worker Integration Tests', () => {
  beforeAll(() => {
    mockServer.start(9999)
    process.env.SPARHAMSTER_API_URL = 'http://localhost:9999/wp-json/wp/v2/posts'
  })

  afterAll(() => {
    mockServer.stop()
  })

  it('should fetch and insert deals', async () => {
    const worker = new WorkerService()
    await worker.start()

    // 等待首次抓取完成
    await sleep(5000)

    const count = await db.query('SELECT COUNT(*) FROM deals')
    expect(count.rows[0].count).toBeGreaterThan(0)
  })
})
```

---

## 七、风险与开放问题 (Risks & Open Issues)

### 7.1 已识别风险

| 风险 | 影响 | 概率 | 等级 | 缓解措施 |
|------|------|------|------|----------|
| **Sparhamster API 结构变更** | 高 - 抓取失败 | 中 | P1 | - 保留 raw_payload 用于调试<br>- 监控解析错误率<br>- 告警机制 |
| **商家识别准确率不足** | 中 - 联盟链接失效 | 中 | P2 | - 人工审核 sample<br>- 逐步完善映射表<br>- 允许未识别商家 |
| **DeepL 配额耗尽** | 中 - 翻译停止 | 中 | P2 | - 监控配额<br>- 缓存机制<br>- 准备备用 Provider |
| **随机调度器时间窗口重叠** | 低 - 多次抓取重叠 | 低 | P3 | - 任务锁机制<br>- 检查 isRunning 状态 |
| **数据库迁移失败** | 高 - 服务不可用 | 低 | P1 | - 先在测试环境验证<br>- 完整备份<br>- 回滚脚本 |
| **被 IP 封禁** | 高 - 无法抓取 | 低 | P1 | - 多层防护 (UA/间隔/429)<br>- 代理池 (未来) |

### 7.2 开放问题

#### Q1: 商家 Logo 提取的可靠性
**问题**: Sparhamster 的商家 logo 是否始终位于固定路径 `/images/shops/*.png`?
**待验证**:
- [ ] 采样分析最近 100 条记录的 logo 位置
- [ ] 确认是否有其他格式 (SVG? WebP?)
- [ ] 是否有 logo 缺失的情况?
**决策者**: Codex
**截止日期**: 进入 STEP4 前

#### Q2: ContentBlocks JSON 结构是否需要版本控制?
**问题**: 如果 ContentBlock 类型定义变更,旧数据如何兼容?
**方案A**: 增加 version 字段 `{ version: 1, blocks: [...] }`
**方案B**: 数据库存储时兼容旧版本,读取时自动升级
**决策者**: 用户
**截止日期**: STEP3 数据库设计前

#### Q3: 是否需要支持手动触发抓取?
**问题**: 除了自动调度,是否需要提供 API/CLI 手动触发?
**用途**: 测试、紧急更新
**决策**:
- 如需要,在 Worker 暴露 HTTP 端点 `/api/trigger-fetch`
- 需添加认证机制 (Bearer Token)
**决策者**: 用户
**优先级**: P3 (Nice to have)

#### Q4: 重复记录的保留策略
**问题**: `duplicate_count >5` 的记录是否需要特殊处理?
**场景**: 长期优惠 (如订阅服务) 可能持续出现
**方案A**: 保留,用于统计"热门优惠"
**方案B**: 合并为单条,更新 `expiresAt`
**决策者**: 用户
**截止日期**: STEP3 前

#### Q5: 翻译失败的记录如何处理?
**问题**: 如果某条记录翻译连续失败 3 次,是否展示原文?
**当前行为**: 标记为 `translation_status='failed'`,不展示
**建议**: 允许展示原文,前端加"未翻译"标识
**决策者**: 用户
**优先级**: P2

---

## 八、实施步骤 (Implementation Steps)

### 8.1 任务分解

#### 阶段 A: 准备工作 (1-2 天)

| 任务 | 描述 | 前置条件 | 交付物 |
|------|------|----------|--------|
| A1. STEP3 数据库设计审批 | 等待 STEP3 文档完成并批准 | STEP2 批准 | DDL 脚本 |
| A2. 配置文件准备 | 创建 `merchant-mapping.json` | - | 配置文件 |
| A3. 开发环境验证 | 确认本地可连接数据库/Redis | - | 环境检查通过 |
| A4. Mock Server 搭建 | 实现 Sparhamster API Mock | - | Mock Server 代码 |

#### 阶段 B: 核心模块开发 (5-7 天)

| 任务 | 文件 | 描述 | 依赖 | 测试 |
|------|------|------|------|------|
| B1. Content Normalizer | `content-normalizer.ts` | HTML 解析,字段提取 | - | 单元测试 |
| B2. Content Hasher | `content-hasher.ts` | Hash 计算 | - | 单元测试 |
| B3. Deduper | `deduper.ts` | 去重逻辑 | B2 | 单元测试 |
| B4. Merchant Resolver | `merchant-resolver.ts` | 商家识别 | 配置文件 | 单元测试 |
| B5. Random Scheduler | `scheduler.ts` | 随机调度算法 | - | 单元测试 |
| B6. Retry Strategy | `retry-strategy.ts` | 指数退避重试 | - | 单元测试 |
| B7. API Fetcher 重构 | `api-fetcher.ts` | 集成以上模块 | B1-B6 | 集成测试 |

#### 阶段 C: 翻译模块优化 (2-3 天)

| 任务 | 文件 | 描述 | 依赖 | 测试 |
|------|------|------|------|------|
| C1. 批量翻译接口 | `translation-manager.ts` | 支持一次翻译多段文本 | - | 单元测试 |
| C2. Provider 降级 | `translation-manager.ts` | 多 Provider 链 | C1 | 单元测试 |
| C3. 配额统计 | `quota-tracker.ts` | Redis 记录用量 | - | 单元测试 |
| C4. Translation Worker 重构 | `translation-worker.ts` | 使用新接口 | C1-C3 | 集成测试 |

#### 阶段 D: 数据库交互 (2 天)

| 任务 | 文件 | 描述 | 依赖 | 测试 |
|------|------|------|------|------|
| D1. Database Manager 扩展 | `database.ts` | 新增 upsertDeal 方法 | STEP3 迁移 | 单元测试 |
| D2. 事务处理 | `database.ts` | 批量操作事务包裹 | D1 | 集成测试 |
| D3. Schema 版本检查 | `database.ts` | 启动前验证 | STEP3 迁移 | 单元测试 |

#### 阶段 E: 日志与监控 (1-2 天)

| 任务 | 文件 | 描述 | 依赖 | 测试 |
|------|------|------|------|------|
| E1. 结构化日志 | `logger.ts` | JSON 格式日志 | - | - |
| E2. Metrics Collector | `metrics-collector.ts` | 指标收集 | - | 单元测试 |
| E3. Alert Manager | `alert-manager.ts` | 告警逻辑 | E2 | 单元测试 |
| E4. Metrics 端点 | `metrics-server.ts` | HTTP /metrics | E2 | 手动测试 |

#### 阶段 F: 集成与测试 (3-4 天)

| 任务 | 描述 | 依赖 | 交付物 |
|------|------|------|--------|
| F1. 集成所有模块 | 更新 index.ts,组装所有模块 | A-E | 完整 Worker |
| F2. 端到端测试 | 使用 Mock Server 测试完整流程 | F1 | 测试报告 |
| F3. 性能测试 | 测试 100 条记录的处理时间 | F1 | 性能报告 |
| F4. 错误场景测试 | 模拟各种错误 (429, 500, 网络超时) | F1 | 测试报告 |
| F5. 长时间运行测试 | 运行 24 小时,监控内存泄漏 | F1 | 稳定性报告 |

#### 阶段 G: 文档与交付 (1 天)

| 任务 | 描述 | 交付物 |
|------|------|--------|
| G1. 代码注释 | 补充 JSDoc 注释 | 源代码 |
| G2. README 更新 | 更新 Worker 包的 README | README.md |
| G3. 配置示例 | 提供 .env.example | .env.example |
| G4. 迁移指南 | 编写从旧版本升级的步骤 | MIGRATION.md |

### 8.2 时间估算

**总工时**: 15-20 天 (按 1 人全职计算)

**关键路径**:
```
STEP3 批准 (阻塞) → A1-A4 (2天) → B1-B7 (7天) → D1-D3 (2天) → F1-F5 (4天) → 交付
```

**并行任务**:
- C1-C4 (翻译) 可与 B 阶段并行
- E1-E4 (监控) 可与 C 阶段并行

### 8.3 验收标准

**代码质量**:
- [ ] TypeScript 严格模式无错误
- [ ] ESLint 检查通过
- [ ] 单元测试覆盖率 >80%
- [ ] 集成测试覆盖核心流程
- [ ] 所有 TODOs 已解决或转为 Issue

**功能验收**:
- [ ] 随机间隔调度正常工作 (5-15 分钟)
- [ ] 商家识别准确率 >90% (基于 sample)
- [ ] 去重机制无误 (重复抓取不产生新记录)
- [ ] 翻译成功率 >99%
- [ ] 错误重试机制生效
- [ ] 优雅停机无数据丢失

**性能验收**:
- [ ] 抓取 40 条记录 <30 秒
- [ ] 内存使用 <500MB (稳定运行 24 小时)
- [ ] 数据库查询响应 <100ms (P95)
- [ ] 翻译单条记录 <2 秒 (含缓存)

**监控验收**:
- [ ] 日志格式统一 (JSON)
- [ ] Metrics 端点可访问
- [ ] 告警规则已配置
- [ ] 测试环境成功运行 7 天无崩溃

---

## 九、自检清单 (Self-Check for Claude)

在提交本文档前,我已确认:

**完整性**:
- [x] 所有章节都有实质内容 (非占位符)
- [x] 每个模块有输入/输出定义
- [x] 数据流图清晰可读
- [x] 配置变量有默认值与范围
- [x] 风险评估包含缓解措施

**准确性**:
- [x] 基于实际代码分析 (sparhamster-api-fetcher.ts)
- [x] API 响应结构基于真实请求
- [x] 引用文件路径正确 (packages/worker/src/...)
- [x] 环境变量与 STEP1 一致

**可执行性**:
- [x] 代码示例可直接运行 (伪代码除外)
- [x] 测试计划有具体步骤
- [x] 实施步骤有明确依赖关系
- [x] 验收标准可量化

**设计合理性**:
- [x] 随机调度算法真正随机 (非固定+延迟)
- [x] 防封禁策略多层防护
- [x] 去重机制基于内容 hash (非仅 GUID)
- [x] 翻译优化有批量+缓存+降级
- [x] 日志结构化 (JSON)

**待确认项明确标注**:
- [x] 商家 logo 路径 (需 Codex 验证)
- [x] ContentBlocks 版本控制 (需用户决策)
- [x] 重复记录保留策略 (需用户决策)

---

**文档版本**: v1.0
**创建日期**: 2025-10-12
**作者**: Claude
**依赖**: STEP1_FOUNDATION.md (已批准)
**阻塞**: STEP3_DB_SCHEMA.md (待完成)
**审核状态**: ⏳ 待审核

---

**重要提示**: 本文档未经批准前,不得开始编码。所有设计细节需经用户和 Codex 审核通过后方可实施。
