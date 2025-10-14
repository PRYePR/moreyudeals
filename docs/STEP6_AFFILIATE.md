# STEP6: 商家识别与联盟链接集成

**目标**: 实现自动商家识别、Logo 提取、联盟链接替换与收益追踪
**阶段**: 阶段 3 - 商家识别与联盟链
**依赖**: STEP5 完成 (Web 端已上线,正常展示 Deals)

---

## 一、设计目标 (Design Goals)

### 1.1 核心目标

1. **商家识别 (Merchant Recognition)**
   - 从优惠内容中自动识别商家名称
   - 提取商家 Logo 图片
   - 建立商家映射表 (名称规范化)

2. **联盟链接集成 (Affiliate Link Integration)**
   - 自动替换商家链接为联盟链接
   - 支持多个联盟网络 (Amazon Associates, AWIN, etc.)
   - 白名单机制 (仅替换已授权商家)

3. **配置化管理 (Configuration Management)**
   - 后台可配置商家规则
   - 联盟链接模板管理
   - 动态启用/禁用联盟功能

4. **收益追踪 (Tracking & Analytics)**
   - 记录联盟链接点击
   - 统计转化率
   - 收益报表生成

---

## 二、商家识别策略

### 2.1 识别流程

```
┌──────────────────────┐
│ Sparhamster API 数据 │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────┐
│ 1. 提取商家 Logo URL     │
│    - WordPress 内容解析   │
│    - 查找特定 CSS 类      │
│    - 图片位置启发式规则   │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 2. 从 Logo URL 识别商家  │
│    - URL 路径分析         │
│    - 文件名匹配           │
│    - 域名反查             │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 3. 商家名称规范化        │
│    - 映射表查询           │
│    - 别名处理             │
│    - 品牌统一             │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 4. 存储到数据库          │
│    - merchant (规范名称)  │
│    - merchant_logo (URL)  │
│    - merchant_link (原链) │
└──────────────────────────┘
```

### 2.2 Logo 提取策略

#### 策略 1: CSS 类名识别
```typescript
// Sparhamster 常用 CSS 类
const logoClasses = [
  '.merchant-logo',
  '.shop-logo',
  '.store-logo',
  '.brand-logo',
  '.deal-merchant img',
]

// Cheerio 解析
const $ = cheerio.load(html)
for (const selector of logoClasses) {
  const logo = $(selector).first()
  if (logo.length > 0) {
    return logo.attr('src')
  }
}
```

#### 策略 2: 图片位置启发式
```typescript
// Logo 通常在内容顶部,且尺寸较小 (< 200x200px)
const images = $('img')
for (const img of images) {
  const src = $(img).attr('src')
  const alt = $(img).attr('alt')
  const width = parseInt($(img).attr('width') || '0')
  const height = parseInt($(img).attr('height') || '0')

  // 启发式规则
  const isTopImage = images.index(img) <= 2  // 前 3 张图
  const isSmallImage = width < 200 && height < 200
  const hasShopAlt = /shop|store|merchant|amazon|ebay/i.test(alt || '')

  if (isTopImage && isSmallImage && hasShopAlt) {
    return src
  }
}
```

#### 策略 3: URL 路径分析
```typescript
// Sparhamster 上传的 Logo 通常包含特定路径
const logoPatterns = [
  /uploads\/.*\/(logo|merchant|shop|brand)/i,
  /wp-content\/.*logo/i,
  /cdn\..*logo/i,
]

for (const img of images) {
  const src = $(img).attr('src')
  if (logoPatterns.some(pattern => pattern.test(src))) {
    return src
  }
}
```

### 2.3 商家名称识别

#### 方法 1: 从 Logo URL 提取
```typescript
// 示例: https://www.sparhamster.at/wp-content/uploads/amazon-logo.png
function extractMerchantFromLogoUrl(url: string): string | null {
  const filename = url.split('/').pop()?.replace(/\.(png|jpg|jpeg|svg|webp)$/i, '')

  if (!filename) return null

  // 移除 -logo, _logo 等后缀
  const cleaned = filename.replace(/[-_]?logo$/i, '')

  // 商家名称映射
  const merchantMap: Record<string, string> = {
    'amazon': 'Amazon',
    'amzn': 'Amazon',
    'ebay': 'eBay',
    'mediamarkt': 'MediaMarkt',
    'saturn': 'Saturn',
    'otto': 'OTTO',
    'zalando': 'Zalando',
    // ... 更多映射
  }

  return merchantMap[cleaned.toLowerCase()] || cleaned
}
```

#### 方法 2: 从商家链接提取
```typescript
// 示例: https://www.amazon.de/...
function extractMerchantFromLink(url: string): string | null {
  const domain = new URL(url).hostname.replace('www.', '')

  const domainToMerchant: Record<string, string> = {
    'amazon.de': 'Amazon',
    'amazon.at': 'Amazon',
    'ebay.de': 'eBay',
    'mediamarkt.at': 'MediaMarkt',
    'saturn.at': 'Saturn',
    // ... 更多映射
  }

  return domainToMerchant[domain] || null
}
```

#### 方法 3: 从 WordPress 标签提取 (现有实现)
```typescript
// 已在 sparhamster-normalizer.ts 中实现
private extractMerchantName(post: WordPressPost): string | undefined {
  const tags = post._embedded?.['wp:term']?.[1] // 第二组通常是 tags

  if (!tags) return undefined

  // 查找以大写字母开头的标签 (通常是商家名)
  const capitalized = tags.find((tag) => /^[A-Z][A-Za-z0-9]+/.test(tag.name))
  return capitalized?.name
}
```

### 2.4 商家映射表

#### 数据库表设计
```sql
-- 商家映射表
CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,        -- 规范名称 (如 "Amazon")
  slug VARCHAR(100) NOT NULL UNIQUE,        -- URL 友好名称 (如 "amazon")
  display_name VARCHAR(100) NOT NULL,       -- 展示名称 (如 "Amazon.de")
  logo_url TEXT,                            -- 官方 Logo URL
  website_url TEXT,                         -- 官网 URL
  description TEXT,                         -- 商家描述

  -- 别名配置 (JSONB 数组)
  aliases JSONB DEFAULT '[]'::jsonb,        -- ["amzn", "amazon.de", "amazon.at"]

  -- 联盟配置
  affiliate_enabled BOOLEAN DEFAULT false,  -- 是否启用联盟
  affiliate_network VARCHAR(50),            -- 联盟网络 (amazon, awin, tradedoubler)
  affiliate_id VARCHAR(100),                -- 联盟 ID
  affiliate_url_template TEXT,              -- URL 模板

  -- 统计数据
  deals_count INTEGER DEFAULT 0,            -- 关联优惠数
  clicks_count INTEGER DEFAULT 0,           -- 点击统计
  revenue_total DECIMAL(10,2) DEFAULT 0,    -- 总收益

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_merchants_slug ON merchants(slug);
CREATE INDEX idx_merchants_affiliate_enabled ON merchants(affiliate_enabled);
CREATE UNIQUE INDEX idx_merchants_name ON merchants(name);

-- 触发器
CREATE TRIGGER update_merchants_updated_at
  BEFORE UPDATE ON merchants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 初始数据种子
```typescript
const seedMerchants = [
  {
    name: 'Amazon',
    slug: 'amazon',
    display_name: 'Amazon.de',
    logo_url: 'https://cdn.example.com/logos/amazon.svg',
    website_url: 'https://www.amazon.de',
    aliases: ['amzn', 'amazon.de', 'amazon.at', 'amazon-de'],
    affiliate_enabled: true,
    affiliate_network: 'amazon',
    affiliate_id: 'moreyudeals-21',  // 待申请
    affiliate_url_template: 'https://www.amazon.de/dp/{asin}?tag={affiliate_id}',
  },
  {
    name: 'MediaMarkt',
    slug: 'mediamarkt',
    display_name: 'MediaMarkt',
    logo_url: 'https://cdn.example.com/logos/mediamarkt.svg',
    website_url: 'https://www.mediamarkt.at',
    aliases: ['media-markt', 'media markt', 'mediamarkt.at', 'mediamarkt.de'],
    affiliate_enabled: true,
    affiliate_network: 'awin',
    affiliate_id: '12345',  // 示例 ID
    affiliate_url_template: 'https://www.awin1.com/cread.php?awinmid=XXX&awinaffid={affiliate_id}&clickref=&p={url}',
  },
  {
    name: 'Saturn',
    slug: 'saturn',
    display_name: 'Saturn',
    logo_url: 'https://cdn.example.com/logos/saturn.svg',
    website_url: 'https://www.saturn.at',
    aliases: ['saturn.at', 'saturn.de'],
    affiliate_enabled: true,
    affiliate_network: 'awin',
    affiliate_id: '12346',
    affiliate_url_template: 'https://www.awin1.com/cread.php?awinmid=XXX&awinaffid={affiliate_id}&clickref=&p={url}',
  },
  {
    name: 'eBay',
    slug: 'ebay',
    display_name: 'eBay.de',
    logo_url: 'https://cdn.example.com/logos/ebay.svg',
    website_url: 'https://www.ebay.de',
    aliases: ['ebay.de', 'ebay.at'],
    affiliate_enabled: true,
    affiliate_network: 'ebay',
    affiliate_id: '5338827256',  // 示例 Campaign ID
    affiliate_url_template: 'https://rover.ebay.com/rover/1/5221-53469-19255-0/1?mpre={url}&campid={affiliate_id}',
  },
  {
    name: 'OTTO',
    slug: 'otto',
    display_name: 'OTTO',
    logo_url: 'https://cdn.example.com/logos/otto.svg',
    website_url: 'https://www.otto.de',
    aliases: ['otto.de', 'otto.at'],
    affiliate_enabled: true,
    affiliate_network: 'awin',
    affiliate_id: '12347',
    affiliate_url_template: 'https://www.awin1.com/cread.php?awinmid=XXX&awinaffid={affiliate_id}&clickref=&p={url}',
  },
  // ... 更多商家
]
```

---

## 三、联盟链接集成

### 3.1 联盟网络支持

#### Amazon Associates (亚马逊联盟)
```typescript
interface AmazonAffiliateConfig {
  affiliateTag: string    // 如 'moreyudeals-21'
  trackingId?: string
}

class AmazonAffiliateService {
  /**
   * 将 Amazon 商品链接转换为联盟链接
   * @param originalUrl 原始链接
   * @param affiliateTag 联盟标签
   * @returns 联盟链接
   */
  convertToAffiliateLink(
    originalUrl: string,
    affiliateTag: string
  ): string {
    const url = new URL(originalUrl)

    // 提取 ASIN (Amazon Standard Identification Number)
    const asin = this.extractAsin(url)

    if (asin) {
      // 使用短链接格式
      return `https://www.amazon.de/dp/${asin}?tag=${affiliateTag}`
    }

    // 如果无法提取 ASIN,添加 tag 参数
    url.searchParams.set('tag', affiliateTag)
    return url.toString()
  }

  /**
   * 从 URL 提取 ASIN
   */
  private extractAsin(url: URL): string | null {
    // 格式 1: /dp/ASIN
    const dpMatch = url.pathname.match(/\/dp\/([A-Z0-9]{10})/)
    if (dpMatch) return dpMatch[1]

    // 格式 2: /gp/product/ASIN
    const gpMatch = url.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/)
    if (gpMatch) return gpMatch[1]

    // 格式 3: ?asin=ASIN
    const asinParam = url.searchParams.get('asin')
    if (asinParam && /^[A-Z0-9]{10}$/.test(asinParam)) {
      return asinParam
    }

    return null
  }
}
```

#### AWIN (通用联盟网络)
```typescript
interface AWINAffiliateConfig {
  publisherId: string       // 发布者 ID
  merchantId: string        // 商家 ID
  clickRef?: string         // 点击追踪参数
}

class AWINAffiliateService {
  /**
   * 生成 AWIN 联盟链接
   */
  convertToAffiliateLink(
    originalUrl: string,
    config: AWINAffiliateConfig
  ): string {
    const encodedUrl = encodeURIComponent(originalUrl)

    return `https://www.awin1.com/cread.php?` +
      `awinmid=${config.merchantId}&` +
      `awinaffid=${config.publisherId}&` +
      `clickref=${config.clickRef || ''}&` +
      `p=${encodedUrl}`
  }
}
```

#### eBay Partner Network
```typescript
interface eBayAffiliateConfig {
  campaignId: string
  customId?: string
}

class eBayAffiliateService {
  convertToAffiliateLink(
    originalUrl: string,
    config: eBayAffiliateConfig
  ): string {
    const encodedUrl = encodeURIComponent(originalUrl)

    // eBay 使用 Rover 链接
    return `https://rover.ebay.com/rover/1/5221-53469-19255-0/1?` +
      `mpre=${encodedUrl}&` +
      `campid=${config.campaignId}&` +
      `customid=${config.customId || ''}`
  }
}
```

### 3.2 联盟链接生成流程

```typescript
// packages/worker/src/services/affiliate-link-manager.ts

export class AffiliateLinkManager {
  private db: DatabaseManager
  private amazonService: AmazonAffiliateService
  private awinService: AWINAffiliateService
  private ebayService: eBayAffiliateService

  /**
   * 为 Deal 生成联盟链接
   */
  async generateAffiliateLink(deal: Deal): Promise<string | null> {
    // 检查全局开关
    if (!process.env.AFFILIATE_ENABLED || process.env.AFFILIATE_ENABLED !== 'true') {
      return null
    }

    // 查询商家配置
    const merchant = await this.db.query<Merchant>(
      'SELECT * FROM merchants WHERE name = $1 AND affiliate_enabled = true',
      [deal.merchant]
    )

    if (!merchant || merchant.length === 0) {
      // 商家未启用联盟或不在白名单
      return null
    }

    const merchantConfig = merchant[0]

    // 根据联盟网络选择服务
    switch (merchantConfig.affiliate_network) {
      case 'amazon':
        return this.amazonService.convertToAffiliateLink(
          deal.merchantLink || deal.link,
          merchantConfig.affiliate_id
        )

      case 'awin':
        return this.awinService.convertToAffiliateLink(
          deal.merchantLink || deal.link,
          {
            publisherId: merchantConfig.affiliate_id,
            merchantId: merchantConfig.affiliate_network_merchant_id,
            clickRef: `deal_${deal.id}`,
          }
        )

      case 'ebay':
        return this.ebayService.convertToAffiliateLink(
          deal.merchantLink || deal.link,
          {
            campaignId: merchantConfig.affiliate_id,
            customId: `deal_${deal.id}`,
          }
        )

      default:
        console.warn(`不支持的联盟网络: ${merchantConfig.affiliate_network}`)
        return null
    }
  }

  /**
   * 批量更新 Deals 的联盟链接
   */
  async updateAffiliateLinks(dealIds: string[]): Promise<void> {
    for (const dealId of dealIds) {
      const deal = await this.db.getDealById(dealId)
      if (!deal) continue

      const affiliateLink = await this.generateAffiliateLink(deal)

      if (affiliateLink) {
        await this.db.updateDeal(dealId, {
          affiliateLink,
          affiliateEnabled: true,
          affiliateNetwork: deal.merchant,  // 或从 merchants 表获取
        })

        console.log(`✅ 已更新 Deal ${dealId} 的联盟链接`)
      }
    }
  }
}
```

### 3.3 联盟链接更新时机

```typescript
// 场景 1: Worker 抓取新 Deal 时
export class FetchFlowManager {
  async processFetchedDeals(rawDeals: any[]): Promise<void> {
    for (const raw of rawDeals) {
      // 1. 规范化
      const deal = await this.normalizer.normalize(raw)

      // 2. 去重检查
      const existing = await this.deduplicationManager.checkDuplicate(deal)
      if (existing) continue

      // 3. 写入数据库
      const dealId = await this.database.createDeal(deal)

      // 4. 生成联盟链接 (异步)
      this.affiliateLinkManager.generateAffiliateLink(deal)
        .then(affiliateLink => {
          if (affiliateLink) {
            return this.database.updateDeal(dealId, {
              affiliateLink,
              affiliateEnabled: true,
            })
          }
        })
        .catch(err => console.error('生成联盟链接失败:', err))
    }
  }
}

// 场景 2: 商家配置更新时 (后台触发)
export async function onMerchantConfigUpdated(merchantName: string) {
  // 查找该商家的所有 Deals
  const deals = await db.query<Deal>(
    'SELECT id FROM deals WHERE merchant = $1 AND expires_at > NOW()',
    [merchantName]
  )

  // 批量更新联盟链接
  const dealIds = deals.map(d => d.id)
  await affiliateLinkManager.updateAffiliateLinks(dealIds)

  console.log(`已为 ${deals.length} 个 Deals 更新联盟链接`)
}
```

---

## 四、前端展示与点击追踪

### 4.1 联盟链接展示

```tsx
// packages/web/src/components/DealDetail.tsx

export function DealDetail({ deal }: { deal: Deal }) {
  const displayLink = deal.affiliateLink || deal.merchantLink || deal.link
  const isAffiliateLink = Boolean(deal.affiliateEnabled && deal.affiliateLink)

  return (
    <div className="deal-detail">
      {/* ... 其他内容 ... */}

      <div className="mt-8">
        <a
          href={displayLink}
          target="_blank"
          rel="noopener noreferrer sponsored"  // ✅ 重要: 添加 rel="sponsored"
          onClick={() => handleLinkClick(deal.id, isAffiliateLink)}
          className="cta-button"
        >
          查看优惠
        </a>

        {isAffiliateLink && (
          <p className="text-xs text-gray-500 mt-2">
            * 通过联盟链接购买，我们可能获得佣金，但不会增加您的成本
          </p>
        )}
      </div>
    </div>
  )
}
```

### 4.2 点击追踪

```typescript
// packages/web/src/lib/analytics.ts

export async function handleLinkClick(
  dealId: string,
  isAffiliateLink: boolean
): Promise<void> {
  try {
    await fetch('/api/tracking/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealId,
        isAffiliateLink,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        referrer: document.referrer,
      }),
    })
  } catch (error) {
    console.error('点击追踪失败:', error)
  }
}
```

```typescript
// packages/web/src/app/api/tracking/click/route.ts

export async function POST(request: Request) {
  const body = await request.json()
  const { dealId, isAffiliateLink } = body

  // 写入点击记录表
  await db.query(
    `INSERT INTO affiliate_clicks (
      deal_id, is_affiliate, clicked_at, user_agent, referrer
    ) VALUES ($1, $2, $3, $4, $5)`,
    [dealId, isAffiliateLink, new Date(), body.userAgent, body.referrer]
  )

  // 更新商家点击统计
  if (isAffiliateLink) {
    await db.query(
      `UPDATE merchants
       SET clicks_count = clicks_count + 1
       WHERE name = (SELECT merchant FROM deals WHERE id = $1)`,
      [dealId]
    )
  }

  return Response.json({ success: true })
}
```

### 4.3 点击统计表

```sql
-- 联盟链接点击记录表
CREATE TABLE affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id),
  merchant_name VARCHAR(100),            -- 冗余字段,便于统计
  is_affiliate BOOLEAN NOT NULL,         -- 是否联盟链接
  clicked_at TIMESTAMP DEFAULT NOW() NOT NULL,
  user_agent TEXT,
  referrer TEXT,
  ip_address INET,                       -- 可选: 记录 IP
  session_id VARCHAR(100),               -- 可选: 会话追踪

  CONSTRAINT fk_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

CREATE INDEX idx_affiliate_clicks_deal_id ON affiliate_clicks(deal_id);
CREATE INDEX idx_affiliate_clicks_clicked_at ON affiliate_clicks(clicked_at DESC);
CREATE INDEX idx_affiliate_clicks_merchant ON affiliate_clicks(merchant_name);
```

---

## 五、后台管理界面

### 5.1 商家管理

#### 功能需求
- [ ] 商家列表 (CRUD)
- [ ] 商家详情编辑
- [ ] Logo 上传
- [ ] 别名管理
- [ ] 联盟配置
- [ ] 统计数据查看

#### 界面设计 (Strapi / 自建后台)

**选项 1: 扩展 Strapi CMS**
```typescript
// packages/strapi/src/api/merchant/content-types/merchant/schema.json
{
  "kind": "collectionType",
  "collectionName": "merchants",
  "info": {
    "singularName": "merchant",
    "pluralName": "merchants",
    "displayName": "Merchant"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "slug": {
      "type": "uid",
      "targetField": "name"
    },
    "display_name": {
      "type": "string",
      "required": true
    },
    "logo": {
      "type": "media",
      "multiple": false,
      "allowedTypes": ["images"]
    },
    "website_url": {
      "type": "string"
    },
    "description": {
      "type": "richtext"
    },
    "aliases": {
      "type": "json"
    },
    "affiliate_enabled": {
      "type": "boolean",
      "default": false
    },
    "affiliate_network": {
      "type": "enumeration",
      "enum": ["amazon", "awin", "ebay", "tradedoubler"]
    },
    "affiliate_id": {
      "type": "string"
    },
    "affiliate_url_template": {
      "type": "text"
    }
  }
}
```

**选项 2: 自建 Next.js Admin Panel**
```tsx
// packages/web/src/app/admin/merchants/page.tsx

export default async function MerchantsAdminPage() {
  const merchants = await fetchMerchants()

  return (
    <AdminLayout>
      <h1>商家管理</h1>

      <Button onClick={() => router.push('/admin/merchants/new')}>
        新增商家
      </Button>

      <Table>
        <thead>
          <tr>
            <th>Logo</th>
            <th>名称</th>
            <th>联盟状态</th>
            <th>优惠数</th>
            <th>点击数</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {merchants.map(merchant => (
            <tr key={merchant.id}>
              <td><img src={merchant.logo_url} width={40} /></td>
              <td>{merchant.name}</td>
              <td>
                {merchant.affiliate_enabled ? (
                  <Badge color="green">已启用</Badge>
                ) : (
                  <Badge color="gray">未启用</Badge>
                )}
              </td>
              <td>{merchant.deals_count}</td>
              <td>{merchant.clicks_count}</td>
              <td>
                <Button size="sm" onClick={() => editMerchant(merchant.id)}>
                  编辑
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </AdminLayout>
  )
}
```

### 5.2 联盟链接测试工具

```tsx
// packages/web/src/app/admin/affiliate-test/page.tsx

export default function AffiliateTestPage() {
  const [originalUrl, setOriginalUrl] = useState('')
  const [merchant, setMerchant] = useState('Amazon')
  const [affiliateLink, setAffiliateLink] = useState('')

  const handleTest = async () => {
    const response = await fetch('/api/admin/affiliate/test', {
      method: 'POST',
      body: JSON.stringify({ originalUrl, merchant }),
    })

    const data = await response.json()
    setAffiliateLink(data.affiliateLink)
  }

  return (
    <AdminLayout>
      <h1>联盟链接测试</h1>

      <Form>
        <Input
          label="原始链接"
          value={originalUrl}
          onChange={e => setOriginalUrl(e.target.value)}
          placeholder="https://www.amazon.de/dp/B08N5WRWNW"
        />

        <Select
          label="商家"
          value={merchant}
          onChange={e => setMerchant(e.target.value)}
        >
          <option value="Amazon">Amazon</option>
          <option value="MediaMarkt">MediaMarkt</option>
          <option value="eBay">eBay</option>
        </Select>

        <Button onClick={handleTest}>生成联盟链接</Button>
      </Form>

      {affiliateLink && (
        <div className="mt-8 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">生成的联盟链接:</h3>
          <code className="break-all">{affiliateLink}</code>

          <div className="mt-4">
            <a
              href={affiliateLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 underline"
            >
              测试跳转 →
            </a>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
```

---

## 六、收益报表

### 6.1 统计指标

```typescript
interface AffiliateStats {
  // 时间范围
  startDate: Date
  endDate: Date

  // 点击指标
  totalClicks: number           // 总点击数
  affiliateClicks: number       // 联盟链接点击数
  clickRate: number             // 点击率 (联盟/总)

  // 商家分布
  topMerchants: Array<{
    name: string
    clicks: number
    revenue: number
  }>

  // 转化指标 (需对接联盟网络 API)
  conversions: number           // 转化订单数
  conversionRate: number        // 转化率
  revenue: number               // 总收益 (EUR)
  averageOrderValue: number     // 平均订单价值
}
```

### 6.2 报表 SQL 查询

```sql
-- 按商家统计点击数
SELECT
  merchant_name,
  COUNT(*) as total_clicks,
  COUNT(*) FILTER (WHERE is_affiliate = true) as affiliate_clicks,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE is_affiliate = true) / NULLIF(COUNT(*), 0),
    2
  ) as click_rate
FROM affiliate_clicks
WHERE clicked_at >= $1 AND clicked_at < $2
GROUP BY merchant_name
ORDER BY total_clicks DESC
LIMIT 10;

-- 按日期统计点击趋势
SELECT
  DATE(clicked_at) as date,
  COUNT(*) as total_clicks,
  COUNT(DISTINCT deal_id) as unique_deals,
  COUNT(DISTINCT session_id) as unique_sessions
FROM affiliate_clicks
WHERE clicked_at >= $1 AND clicked_at < $2
GROUP BY DATE(clicked_at)
ORDER BY date;

-- 最受欢迎的优惠 (按点击数)
SELECT
  d.id,
  d.title,
  d.merchant,
  COUNT(ac.id) as clicks,
  COUNT(ac.id) FILTER (WHERE ac.is_affiliate = true) as affiliate_clicks
FROM deals d
LEFT JOIN affiliate_clicks ac ON ac.deal_id = d.id
WHERE d.published_at >= $1
GROUP BY d.id, d.title, d.merchant
ORDER BY clicks DESC
LIMIT 20;
```

### 6.3 报表界面

```tsx
// packages/web/src/app/admin/reports/page.tsx

export default async function AffiliateReportsPage() {
  const stats = await fetchAffiliateStats({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 天前
    endDate: new Date(),
  })

  return (
    <AdminLayout>
      <h1>联盟收益报表</h1>

      {/* 关键指标卡片 */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="总点击数"
          value={stats.totalClicks}
          change="+12.5%"
          trend="up"
        />
        <MetricCard
          title="联盟点击数"
          value={stats.affiliateClicks}
          change="+8.3%"
          trend="up"
        />
        <MetricCard
          title="点击率"
          value={`${stats.clickRate.toFixed(1)}%`}
          change="-2.1%"
          trend="down"
        />
        <MetricCard
          title="预估收益"
          value={`€${stats.revenue.toFixed(2)}`}
          change="+5.7%"
          trend="up"
        />
      </div>

      {/* 点击趋势图表 */}
      <Card title="点击趋势 (最近 30 天)">
        <LineChart data={stats.clickTrend} />
      </Card>

      {/* 商家排行榜 */}
      <Card title="商家点击排行">
        <Table>
          <thead>
            <tr>
              <th>商家</th>
              <th>总点击</th>
              <th>联盟点击</th>
              <th>预估收益</th>
            </tr>
          </thead>
          <tbody>
            {stats.topMerchants.map(merchant => (
              <tr key={merchant.name}>
                <td>{merchant.name}</td>
                <td>{merchant.clicks}</td>
                <td>{merchant.affiliateClicks}</td>
                <td>€{merchant.revenue.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </AdminLayout>
  )
}
```

---

## 七、实施计划

### 7.1 任务分解 (2 周)

#### T1: 商家识别逻辑 (3 天)
- [ ] 实现 Logo 提取算法 (3 种策略)
- [ ] 实现商家名称识别 (从 Logo URL / 链接 / 标签)
- [ ] 创建商家映射服务 (MerchantMappingService)
- [ ] 更新 SparhamsterNormalizer (填充 merchantLogo 字段)
- [ ] 编写单元测试 (覆盖率 > 90%)

#### T2: 数据库与种子数据 (1 天)
- [ ] 创建 merchants 表迁移脚本
- [ ] 创建 affiliate_clicks 表迁移脚本
- [ ] 编写种子数据 (10+ 个主流商家)
- [ ] 执行迁移并验证

#### T3: 联盟链接服务 (3 天)
- [ ] 实现 AmazonAffiliateService
- [ ] 实现 AWINAffiliateService
- [ ] 实现 eBayAffiliateService
- [ ] 实现 AffiliateLinkManager (核心服务)
- [ ] 集成到 FetchFlowManager
- [ ] 编写单元测试

#### T4: 前端展示与追踪 (2 天)
- [ ] 更新 DealCard 组件 (展示商家 Logo)
- [ ] 更新 DealDetail 组件 (联盟链接 + 免责声明)
- [ ] 实现点击追踪 API (`/api/tracking/click`)
- [ ] 实现前端点击事件处理
- [ ] 添加 `rel="sponsored"` 属性

#### T5: 后台管理 (3 天)
- [ ] 实现商家列表页 (`/admin/merchants`)
- [ ] 实现商家编辑页 (`/admin/merchants/[id]`)
- [ ] 实现联盟链接测试工具 (`/admin/affiliate-test`)
- [ ] 实现 Logo 上传功能
- [ ] 添加权限控制 (仅管理员可访问)

#### T6: 报表与统计 (2 天)
- [ ] 实现统计 SQL 查询
- [ ] 实现报表页面 (`/admin/reports`)
- [ ] 实现图表展示 (Line Chart, Bar Chart)
- [ ] 实现数据导出功能 (CSV)

#### T7: 测试与文档 (1 天)
- [ ] 编写集成测试
- [ ] 编写 E2E 测试 (联盟链接点击流程)
- [ ] 更新 README.md
- [ ] 编写管理员操作手册

#### T8: 联盟账号申请与配置 (异步)
- [ ] 申请 Amazon Associates 账号
- [ ] 申请 AWIN 账号
- [ ] 申请 eBay Partner Network 账号
- [ ] 配置联盟 ID 到环境变量

**总计**: 15 天 (2 周)

### 7.2 里程碑

| 里程碑 | 日期 | 验收标准 |
|--------|------|----------|
| M1: Logo 识别完成 | Day 3 | 商家 Logo 正确提取,准确率 > 80% |
| M2: 联盟链接生成 | Day 7 | 可为 Amazon/AWIN/eBay 生成联盟链接 |
| M3: 前端展示完成 | Day 9 | Logo 展示,联盟链接跳转,点击追踪 |
| M4: 后台管理完成 | Day 12 | 可配置商家,测试联盟链接 |
| M5: 报表完成 | Day 14 | 可查看点击统计,生成报表 |
| M6: 上线就绪 | Day 15 | 测试通过,文档完整 |

---

## 八、环境变量配置

```bash
# packages/worker/.env
# packages/web/.env.local

# 全局联盟开关
AFFILIATE_ENABLED=true  # 生产环境设为 true

# Amazon Associates
AMAZON_AFFILIATE_TAG=moreyudeals-21  # 替换为实际 Tag
AMAZON_TRACKING_ID=your-tracking-id  # 可选

# AWIN
AWIN_PUBLISHER_ID=123456             # 替换为实际 ID
AWIN_TRACKING_DOMAIN=www.awin1.com   # 默认域名

# eBay Partner Network
EBAY_CAMPAIGN_ID=5338827256          # 替换为实际 Campaign ID
EBAY_NETWORK_ID=5221                 # eBay DE/AT

# 点击追踪
TRACKING_ENABLED=true
TRACKING_ANONYMIZE_IP=true           # 是否匿名化 IP (GDPR)
```

---

## 九、验收标准

### 9.1 功能验收

- [ ] **商家识别**
  - [ ] Logo 提取成功率 > 80% (测试 100 个 Deals)
  - [ ] 商家名称识别准确率 > 90%
  - [ ] 商家映射表包含 10+ 个主流商家

- [ ] **联盟链接生成**
  - [ ] Amazon 链接转换正确 (ASIN 提取成功)
  - [ ] AWIN 链接格式正确
  - [ ] eBay 链接格式正确
  - [ ] 白名单机制生效 (仅替换已启用商家)

- [ ] **前端展示**
  - [ ] DealCard 正确显示商家 Logo
  - [ ] DealDetail 显示联盟链接免责声明
  - [ ] 联盟链接添加 `rel="sponsored"` 属性
  - [ ] 点击追踪正常工作

- [ ] **后台管理**
  - [ ] 可 CRUD 商家配置
  - [ ] 可上传 Logo
  - [ ] 可测试联盟链接生成
  - [ ] 权限控制生效

- [ ] **报表统计**
  - [ ] 点击数统计准确
  - [ ] 商家排行榜正确
  - [ ] 图表正常展示
  - [ ] CSV 导出功能正常

### 9.2 性能验收

- [ ] 联盟链接生成 < 50ms
- [ ] Logo 提取 < 100ms (单个 Deal)
- [ ] 点击追踪 API < 100ms
- [ ] 报表查询 < 500ms (30 天数据)

### 9.3 合规验收

- [ ] 添加联盟链接免责声明
- [ ] 添加 `rel="sponsored"` 属性 (SEO)
- [ ] 遵守联盟网络服务条款
- [ ] GDPR 合规 (IP 匿名化, Cookie 提示)

---

## 十、风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 联盟账号申请被拒 | 高 | 中 | 提前申请多个联盟网络,准备替代方案 |
| Logo 识别准确率低 | 中 | 中 | 建立人工审核流程,逐步完善规则 |
| 联盟网络 API 变更 | 中 | 低 | 监控 API 响应,保留原始链接作为备用 |
| 点击追踪不准确 | 中 | 低 | 使用成熟的追踪库,添加日志监控 |
| 违反联盟网络规则导致账号封禁 | 高 | 低 | 严格遵守服务条款,不隐藏联盟标识 |
| 用户投诉联盟链接 | 低 | 低 | 明确标注免责声明,提供反馈渠道 |

---

## 十一、合规与最佳实践

### 11.1 SEO 合规

```html
<!-- ✅ 正确: 标注联盟链接 -->
<a href="..." rel="noopener noreferrer sponsored">查看优惠</a>

<!-- ❌ 错误: 未标注 -->
<a href="..." rel="noopener noreferrer">查看优惠</a>
```

### 11.2 免责声明

```tsx
<p className="text-xs text-gray-600 mt-2">
  * 通过联盟链接购买，我们可能获得佣金，但不会增加您的成本。
  这有助于我们持续提供免费优惠信息服务。
</p>
```

### 11.3 GDPR 合规

```typescript
// 点击追踪时匿名化 IP
function anonymizeIp(ip: string): string {
  const parts = ip.split('.')
  if (parts.length === 4) {
    parts[3] = '0'  // IPv4: 192.168.1.0
  }
  return parts.join('.')
}

// Cookie 提示
<CookieConsent
  message="我们使用 Cookie 来改善您的体验，包括联盟链接追踪。"
  acceptText="接受"
  declineText="拒绝"
/>
```

### 11.4 联盟网络服务条款要点

#### Amazon Associates
- ✅ 必须在页面明显位置标注联盟关系
- ✅ 不得隐藏或伪装联盟链接
- ✅ 不得通过 Email 直接发送联盟链接
- ✅ 需在链接点击后 24 小时内产生订单才有佣金

#### AWIN
- ✅ 不得使用 iframe 隐藏联盟链接
- ✅ 不得通过 URL 缩短服务隐藏链接
- ✅ 需提供真实有价值的内容,不得纯广告站

#### eBay Partner Network
- ✅ 必须使用官方 Rover 链接
- ✅ 不得修改联盟参数
- ✅ 需确保链接可追踪 (不能被广告拦截器屏蔽)

---

## 十二、后续优化方向

### 短期 (Step7)
- [ ] 对接联盟网络 API 获取实际转化数据
- [ ] 实现自动化报表邮件
- [ ] 添加 A/B 测试 (联盟链接 vs 原始链接)

### 中期
- [ ] 机器学习优化 Logo 识别
- [ ] 智能推荐最优联盟网络
- [ ] 用户个性化追踪 (基于 Cookie)

### 长期
- [ ] 对接多个小众联盟网络
- [ ] 实现动态佣金优化
- [ ] 构建商家合作关系 (独家优惠)

---

## 十三、自检清单

在提交本文档前,请确认:

- [ ] 所有章节都有实质内容 (不是占位符)
- [ ] 商家识别策略明确可执行
- [ ] 联盟链接生成逻辑完整
- [ ] 数据库表设计合理
- [ ] 前端展示符合 UI/UX 规范
- [ ] 后台管理功能完整
- [ ] 实施计划有明确时间表
- [ ] 验收标准可验证
- [ ] 合规要求明确
- [ ] 风险识别充分,缓解措施合理

---

**文档版本**: v1.0
**创建日期**: 2025-10-13
**作者**: Claude
**审核状态**: ⏳ 待审核
**依赖**: STEP5 完成 (Web 端已上线)
**后续**: STEP7 (QA 测试与部署)
