# STEP5: Web 端重设计与实现

**目标**: 重构 Next.js Web 端,复刻 Sparhamster 源站 UI/UX,消费新数据库架构,优化性能与 SEO
**阶段**: 阶段 2 - 前端重建
**依赖**: STEP4 完成 (Worker 已可稳定抓取数据到 deals 表)

---

## 一、设计目标 (Design Goals)

### 1.1 核心目标

1. **UI 复刻 (90% 相似度)**
   - 复刻 Sparhamster 源站的页面布局、配色、组件样式
   - 保持简洁、清晰、易于导航的用户体验
   - 移动端响应式设计优先

2. **数据架构切换**
   - 从旧的 `rss_items` 表切换到新的 `deals` 表
   - 正确渲染 `content_blocks` JSON 结构
   - 展示商家 logo 和商家信息
   - 显示翻译后的内容（消费数据库中的译文，而非前端实时翻译）

3. **性能优化**
   - API 响应时间 < 200ms (P95)
   - 页面首屏加载 < 2s (3G 网络)
   - 使用 Redis 缓存热门数据
   - 实现增量静态再生成 (ISR)

4. **SEO 优化**
   - 服务端渲染 (SSR) 关键页面
   - 结构化数据标记 (Schema.org)
   - 动态生成 sitemap.xml
   - Meta 标签优化（OG、Twitter Card）

---

## 二、UI/UX 设计规范

### 2.1 参考源站分析

**Sparhamster 源站**: https://www.sparhamster.at

#### 页面结构
```
┌──────────────────────────────────────────┐
│  Header (固定顶栏)                        │
│  - Logo + 站点名称                        │
│  - 主导航: 首页 | 最新优惠 | 分类 | 搜索   │
│  - 语言切换 (DE/EN)                       │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│  Featured Deal (首页大图卡片)             │
│  - 全宽展示，带大图                       │
│  - 标题 + 价格 + 折扣标签                 │
│  - CTA 按钮                               │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│  Deals Grid (优惠列表)                    │
│  ┌─────────┬─────────┬─────────┐         │
│  │ Card 1  │ Card 2  │ Card 3  │         │
│  ├─────────┼─────────┼─────────┤         │
│  │ Card 4  │ Card 5  │ Card 6  │         │
│  └─────────┴─────────┴─────────┘         │
│  - 每行 3 列 (桌面), 1 列 (移动端)        │
│  - 卡片包含: 图片、标题、价格、商家 Logo  │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│  Footer                                   │
│  - 关于 | 联系 | 隐私政策 | 免责声明      │
│  - 社交媒体链接                           │
│  - 版权信息                               │
└──────────────────────────────────────────┘
```

#### 配色方案
```css
/* 主色调 (Primary) - 绿色系 */
--primary-50:  #f0fdf4;
--primary-100: #dcfce7;
--primary-200: #bbf7d0;
--primary-300: #86efac;
--primary-400: #4ade80;
--primary-500: #22c55e;  /* 主色 */
--primary-600: #16a34a;  /* 深色主色 */
--primary-700: #15803d;
--primary-800: #166534;
--primary-900: #14532d;

/* 强调色 (Accent) - 橙色 */
--accent-500: #f97316;   /* 折扣标签 */
--accent-600: #ea580c;

/* 中性色 */
--gray-50:  #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-500: #6b7280;
--gray-700: #374151;
--gray-900: #111827;     /* 文字主色 */

/* 语义色 */
--success: #10b981;      /* 成功/生效 */
--warning: #f59e0b;      /* 警告/即将过期 */
--error:   #ef4444;      /* 错误/已过期 */
--info:    #3b82f6;      /* 信息提示 */
```

#### 字体规范
```css
/* 字体家族 */
--font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
             Roboto, "Helvetica Neue", Arial, sans-serif;
--font-mono: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", monospace;

/* 字体大小 */
--text-xs:   0.75rem;   /* 12px - 辅助信息 */
--text-sm:   0.875rem;  /* 14px - 正文小 */
--text-base: 1rem;      /* 16px - 正文 */
--text-lg:   1.125rem;  /* 18px - 小标题 */
--text-xl:   1.25rem;   /* 20px - 卡片标题 */
--text-2xl:  1.5rem;    /* 24px - 页面标题 */
--text-3xl:  1.875rem;  /* 30px - 大标题 */
--text-4xl:  2.25rem;   /* 36px - Hero 标题 */

/* 字重 */
--font-normal:    400;
--font-medium:    500;
--font-semibold:  600;
--font-bold:      700;
```

### 2.2 组件设计规范

#### DealCard (优惠卡片)
```tsx
<DealCard>
  ├─ [图片区域]
  │  ├─ 主图 (16:9 比例, lazy load)
  │  ├─ 商家 Logo (绝对定位左上角, 40×40px)
  │  └─ 折扣标签 (绝对定位右上角, 圆角, 橙色背景)
  ├─ [内容区域]
  │  ├─ 标题 (2 行截断, 16px, 粗体)
  │  ├─ 描述 (3 行截断, 14px, 灰色) [可选]
  │  ├─ 价格区域
  │  │  ├─ 现价 (24px, 绿色, 粗体)
  │  │  └─ 原价 (14px, 灰色, 删除线)
  │  └─ 商家名称 (12px, 灰色, 图标+文字)
  └─ [底部信息]
     ├─ 发布时间 (相对时间, 12px, 灰色)
     └─ 查看详情按钮 (右侧, 绿色)
</DealCard>
```

**交互状态**:
- Hover: 卡片阴影加深, 轻微上移 2px
- Active: 卡片轻微缩放 0.98
- Loading: 骨架屏占位

#### DealDetail (优惠详情页)
```tsx
<DealDetail>
  ├─ [面包屑导航] 首页 > 分类 > 当前优惠
  ├─ [主图区域]
  │  ├─ 轮播图 (如有多图)
  │  ├─ 商家 Logo (左上角)
  │  └─ 分享按钮 (右上角)
  ├─ [信息区域]
  │  ├─ 标题 (32px, 粗体)
  │  ├─ 价格 & 折扣标签
  │  ├─ 商家信息 (Logo + 名称 + 评分) [阶段 3]
  │  ├─ 优惠码 (如有, 可点击复制)
  │  ├─ 有效期显示
  │  │  ├─ 有 expiresAt: 显示倒计时 + 过期警告
  │  │  └─ 无 expiresAt: 显示"长期有效"标识 (绿色)
  │  └─ CTA 按钮: "前往购买" / "链接即将更新"
  │     └─ 链接优先级: affiliateUrl → dealUrl → merchantLink
  │        ├─ 有链接: 绿色可点击按钮
  │        └─ 无链接: 灰色禁用按钮 "链接即将更新"
  ├─ [内容区域] (content_blocks 渲染)
  │  ├─ 段落文本
  │  ├─ 列表 (有序/无序)
  │  ├─ 引用块
  │  ├─ 代码块
  │  └─ 嵌入图片
  ├─ [元信息]
  │  ├─ 分类标签
  │  ├─ 发布时间
  │  ├─ 有效期 (有日期显示日期，无日期显示"长期有效")
  │  └─ 数据来源
  └─ [相关优惠] (同商家/同分类, 3-6 个推荐)
</DealDetail>
```

**购买链接 Fallback 策略**:
```typescript
// 链接优先级顺序
const purchaseUrl = deal.affiliateUrl || deal.dealUrl || deal.merchantLink || ''

// 按钮状态
if (hasPurchaseLink) {
  // 显示可点击的"前往购买"按钮 (绿色)
} else {
  // 显示禁用的"链接即将更新"按钮 (灰色)
}
```

**到期状态展示规则**:
1. **有 expiresAt**:
   - 未过期: 显示剩余天数 + 倒计时警告 (≤7天时橙色提醒)
   - 已过期: 显示红色过期警告 "优惠可能已过期"

2. **无 expiresAt** (null):
   - 显示"长期有效"标识 (绿色徽章)
   - 不显示倒计时或过期警告
   - 在统计区域显示 ∞ 符号

3. **预留扩展**:
   - 若后续需支持手动过期标记 (如 `deal.isExpired = true`)
   - 可在代码中添加判断优先级: `deal.isExpired || (expiresAt && expiresAt < now)`

#### Header (顶部导航)
```tsx
<Header>
  ├─ [Logo 区域]
  │  ├─ Logo 图标
  │  └─ 站点名称 "MoreYuDeals"
  ├─ [导航区域]
  │  ├─ 首页
  │  ├─ 最新优惠
  │  ├─ 分类 (下拉菜单)
  │  └─ 搜索框 (带 icon, 可展开)
  ├─ [工具栏]
  │  ├─ 语言切换 (DE/中文)
  │  └─ 移动端菜单按钮
  └─ [移动端抽屉菜单]
     └─ 收起状态时显示 hamburger icon
</Header>
```

**响应式断点**:
- Mobile: < 768px (1 列布局, 隐藏部分导航)
- Tablet: 768px - 1024px (2 列布局)
- Desktop: > 1024px (3 列布局, 完整导航)

### 2.3 动画与交互

#### 微交互
```css
/* 卡片悬停 */
.deal-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease-out;
}

/* 按钮点击 */
.cta-button:active {
  transform: scale(0.95);
}

/* 加载动画 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.skeleton {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

#### 页面过渡
- 页面切换: Fade in (300ms)
- 列表加载: Stagger 动画 (每项延迟 50ms)
- 图片加载: Blur-up 占位符 → 清晰图片

---

## 三、页面结构与路由

### 3.1 路由设计

```
packages/web/src/app/
├── page.tsx                         # 首页 (/)
├── deals/
│   ├── page.tsx                     # 优惠列表 (/deals)
│   └── [id]/
│       └── page.tsx                 # 优惠详情 (/deals/[id])
├── categories/
│   ├── page.tsx                     # 分类总览 (/categories)
│   └── [slug]/
│       └── page.tsx                 # 分类详情 (/categories/[slug])
├── search/
│   └── page.tsx                     # 搜索结果 (/search?q=...)
├── about/
│   └── page.tsx                     # 关于页面 (/about)
├── api/
│   ├── deals/
│   │   ├── route.ts                 # GET /api/deals (列表)
│   │   └── [id]/
│   │       └── route.ts             # GET /api/deals/[id] (详情)
│   ├── categories/
│   │   └── route.ts                 # GET /api/categories (分类列表)
│   ├── search/
│   │   └── route.ts                 # GET /api/search?q=...
│   └── stats/
│       └── route.ts                 # GET /api/stats (统计数据)
├── layout.tsx                       # Root Layout
├── loading.tsx                      # 全局加载状态
├── error.tsx                        # 全局错误页面
└── not-found.tsx                    # 404 页面
```

### 3.2 页面详细设计

#### 3.2.1 首页 (/)

**渲染策略**: ISR (Incremental Static Regeneration, revalidate: 300s)

**页面结构**:
```tsx
export default async function HomePage() {
  const featuredDeals = await fetchFeaturedDeals(6)
  const stats = await fetchStats()

  return (
    <>
      <HeroSection />
      <FeaturedDealsSection deals={featuredDeals} />
      <StatsSection stats={stats} />
      <CategoriesSection />
      <TranslationDisclaimer />
    </>
  )
}
```

**数据需求**:
- Featured Deals: 6 个最新/热门优惠 (从 `/api/deals?featured=true&limit=6`)
- 统计数据: 总优惠数、今日新增、活跃商家数 (从 `/api/stats`)

**SEO**:
- Title: "MoreYuDeals - 奥地利优惠信息聚合 | 最新折扣优惠一站式获取"
- Description: "自动收集并翻译奥地利商家最新折扣信息，覆盖电子产品、时尚服饰、家居用品等多个分类。"
- OG Image: 站点 logo 或精选优惠图片

#### 3.2.2 优惠列表页 (/deals)

**渲染策略**: SSR (服务端渲染) + Client-side Pagination

**查询参数**:
```typescript
interface DealsPageParams {
  page?: number          // 页码 (默认 1)
  limit?: number         // 每页条数 (默认 20)
  category?: string      // 分类过滤 (slug)
  merchant?: string      // 商家过滤 (slug)
  sort?: 'latest' | 'price_asc' | 'price_desc' | 'discount'  // 排序
  featured?: boolean     // 仅精选
}
```

**页面结构**:
```tsx
export default async function DealsPage({
  searchParams
}: {
  searchParams: DealsPageParams
}) {
  const { deals, pagination } = await fetchDeals(searchParams)

  return (
    <>
      <PageHeader title="所有优惠" />
      <FilterBar searchParams={searchParams} />
      <DealsGrid deals={deals} />
      <Pagination pagination={pagination} />
    </>
  )
}
```

**过滤器**:
- 分类筛选 (多选)
- 商家筛选 (多选)
- 价格范围 (滑块)
- 折扣范围 (≥20%, ≥30%, ≥50%)
- 排序: 最新 | 价格升序 | 价格降序 | 折扣最高

#### 3.2.3 优惠详情页 (/deals/[id])

**渲染策略**: ISR (revalidate: 600s) + Dynamic OG Image

**页面结构**:
```tsx
export default async function DealDetailPage({
  params
}: {
  params: { id: string }
}) {
  const deal = await fetchDealById(params.id)

  if (!deal) {
    notFound()
  }

  return (
    <>
      <Breadcrumb items={[
        { label: '首页', href: '/' },
        { label: deal.category, href: `/categories/${deal.categorySlug}` },
        { label: deal.title }
      ]} />
      <DealDetailHeader deal={deal} />
      <DealDetailContent contentBlocks={deal.contentBlocks} />
      <DealMetadata deal={deal} />
      <RelatedDeals merchant={deal.merchant} category={deal.category} />
    </>
  )
}
```

**content_blocks 渲染**:
```tsx
function ContentBlocksRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return blocks.map((block, index) => {
    switch (block.type) {
      case 'paragraph':
        return <p key={index} className="mb-4">{block.content}</p>
      case 'heading':
        return <h2 key={index} className="text-2xl font-bold mt-6 mb-3">
          {block.content}
        </h2>
      case 'list':
        return <ul key={index} className="list-disc pl-6 mb-4">
          {block.items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      case 'image':
        return <Image key={index} src={block.url} alt={block.alt}
                      width={800} height={450} className="rounded-lg mb-4" />
      case 'blockquote':
        return <blockquote key={index}
                 className="border-l-4 border-primary-500 pl-4 italic mb-4">
          {block.content}
        </blockquote>
      case 'code':
        return <pre key={index} className="bg-gray-100 p-4 rounded-lg mb-4">
          <code>{block.content}</code>
        </pre>
      default:
        return null
    }
  })
}
```

**SEO**:
- Title: `{deal.title} - MoreYuDeals`
- Description: `{deal.description}` (前 160 字符)
- OG Image: 动态生成 (包含标题、价格、商家 logo)
- Structured Data: Product Schema (price, availability, merchant)

#### 3.2.4 分类页 (/categories/[slug])

**渲染策略**: ISR (revalidate: 900s)

**页面结构**:
```tsx
export default async function CategoryPage({
  params
}: {
  params: { slug: string }
}) {
  const category = await fetchCategoryBySlug(params.slug)
  const deals = await fetchDealsByCategory(params.slug, { limit: 20 })

  return (
    <>
      <CategoryHeader category={category} />
      <DealsGrid deals={deals} />
      <Pagination />
    </>
  )
}
```

#### 3.2.5 搜索页 (/search)

**渲染策略**: Client-side Rendering (CSR)

**搜索功能**:
- 全文搜索 (标题 + 描述)
- 搜索建议 (typeahead)
- 搜索历史 (localStorage)
- 热门搜索词

**查询参数**:
```typescript
interface SearchParams {
  q: string          // 搜索关键词
  page?: number
  limit?: number
}
```

---

## 四、API 接口设计

### 4.1 API 规范

#### 通用响应格式
```typescript
interface APIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

#### 错误码
```typescript
enum APIErrorCode {
  INVALID_PARAMS = 'INVALID_PARAMS',
  NOT_FOUND = 'NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
```

### 4.2 API 端点详细设计

#### GET /api/deals

**功能**: 获取优惠列表

**查询参数**:
```typescript
interface DealsQueryParams {
  page?: number          // 页码 (默认 1)
  limit?: number         // 每页条数 (默认 20, 最大 100)
  category?: string      // 分类过滤 (slug 或 ID)
  merchant?: string      // 商家过滤 (name 或 ID)
  sort?: 'latest' | 'price_asc' | 'price_desc' | 'discount'
  featured?: boolean     // 仅精选 (默认 false)
  minPrice?: number      // 最低价格
  maxPrice?: number      // 最高价格
  minDiscount?: number   // 最低折扣 (%)
}
```

**SQL 查询**:
```sql
SELECT
  id,
  source_site,
  guid,
  slug,
  title,
  description,
  link,
  image_url,
  merchant,
  merchant_logo,
  price,
  original_price,
  discount,
  currency,
  categories,
  published_at,
  expires_at,
  translation_status,
  is_translated
FROM deals
WHERE
  -- 过滤条件
  ($1::text IS NULL OR categories @> $1::jsonb)  -- 分类过滤
  AND ($2::text IS NULL OR merchant = $2)        -- 商家过滤
  AND ($3::numeric IS NULL OR price >= $3)       -- 最低价格
  AND ($4::numeric IS NULL OR price <= $4)       -- 最高价格
  AND ($5::integer IS NULL OR discount >= $5)    -- 最低折扣
  AND expires_at > NOW()                          -- 未过期
  -- 排序
  ORDER BY
    CASE WHEN $6 = 'latest' THEN published_at END DESC,
    CASE WHEN $6 = 'price_asc' THEN price END ASC,
    CASE WHEN $6 = 'price_desc' THEN price END DESC,
    CASE WHEN $6 = 'discount' THEN discount END DESC,
    published_at DESC  -- 默认排序
LIMIT $7 OFFSET $8;
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "title": "Samsung Galaxy S24 Ultra - Exklusiver Rabatt",
      "description": "Sparen Sie 200€ beim Kauf...",
      "price": 899.99,
      "originalPrice": 1099.99,
      "discount": 18,
      "currency": "EUR",
      "imageUrl": "https://...",
      "merchant": "Amazon",
      "merchantLogo": "https://...",
      "link": "https://...",
      "categories": ["Electronics", "Smartphones"],
      "publishedAt": "2024-01-15T10:00:00Z",
      "expiresAt": "2024-02-15T23:59:59Z",
      "isTranslated": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**缓存策略**:
```typescript
// Redis 缓存键格式
const cacheKey = `deals:list:${JSON.stringify(queryParams)}`
const cacheTTL = 300  // 5 分钟

// 伪代码
const cachedData = await redis.get(cacheKey)
if (cachedData) {
  return JSON.parse(cachedData)
}

const data = await db.query(...)
await redis.setex(cacheKey, cacheTTL, JSON.stringify(data))
return data
```

#### GET /api/deals/[id]

**功能**: 获取优惠详情

**路径参数**:
- `id`: Deal UUID

**SQL 查询**:
```sql
SELECT
  id,
  source_site,
  source_post_id,
  feed_id,
  guid,
  slug,
  content_hash,
  title,
  original_title,
  description,
  original_description,
  content_html,
  content_text,
  content_blocks,
  link,
  image_url,
  images,
  merchant,
  merchant_logo,
  merchant_link,
  affiliate_link,
  affiliate_enabled,
  affiliate_network,
  price,
  original_price,
  discount,
  currency,
  coupon_code,
  categories,
  tags,
  published_at,
  expires_at,
  language,
  translation_status,
  translation_provider,
  translation_language,
  translation_detected_language,
  is_translated,
  duplicate_count,
  first_seen_at,
  last_seen_at,
  created_at,
  updated_at
FROM deals
WHERE id = $1;
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "title": "Samsung Galaxy S24 Ultra - Exklusiver Rabatt",
    "originalTitle": "Samsung Galaxy S24 Ultra - Exklusiver Rabatt",
    "description": "...",
    "originalDescription": "...",
    "contentBlocks": [
      {
        "type": "paragraph",
        "content": "Das neue Samsung Galaxy S24 Ultra..."
      },
      {
        "type": "list",
        "items": ["6.8-inch display", "200MP camera", "S Pen included"]
      },
      {
        "type": "image",
        "url": "https://...",
        "alt": "Samsung Galaxy S24 Ultra"
      }
    ],
    "price": 899.99,
    "originalPrice": 1099.99,
    "discount": 18,
    "currency": "EUR",
    "couponCode": "GALAXY24",
    "imageUrl": "https://...",
    "images": ["https://...", "https://..."],
    "merchant": "Amazon",
    "merchantLogo": "https://...",
    "merchantLink": "https://...",
    "affiliateLink": null,
    "link": "https://...",
    "categories": ["Electronics", "Smartphones"],
    "tags": ["Samsung", "Android", "Flagship"],
    "publishedAt": "2024-01-15T10:00:00Z",
    "expiresAt": "2024-02-15T23:59:59Z",
    "language": "de",
    "translationStatus": "completed",
    "isTranslated": true,
    "duplicateCount": 1,
    "firstSeenAt": "2024-01-15T09:50:00Z",
    "lastSeenAt": "2024-01-15T10:00:00Z"
  }
}
```

**缓存策略**:
```typescript
const cacheKey = `deals:detail:${id}`
const cacheTTL = 600  // 10 分钟
```

#### GET /api/categories

**功能**: 获取所有分类及其优惠数量

**SQL 查询**:
```sql
SELECT
  cat AS name,
  COUNT(*) AS count
FROM deals,
  jsonb_array_elements_text(categories) AS cat
WHERE expires_at > NOW()
GROUP BY cat
ORDER BY count DESC;
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    { "name": "Electronics", "slug": "electronics", "count": 234 },
    { "name": "Fashion", "slug": "fashion", "count": 189 },
    { "name": "Home & Kitchen", "slug": "home-kitchen", "count": 156 }
  ]
}
```

#### GET /api/search

**功能**: 搜索优惠

**查询参数**:
```typescript
interface SearchParams {
  q: string          // 搜索关键词 (必需)
  page?: number
  limit?: number
}
```

**SQL 查询** (使用 PostgreSQL 全文搜索):
```sql
-- 创建全文搜索索引 (一次性)
CREATE INDEX idx_deals_search
ON deals
USING gin(to_tsvector('german', title || ' ' || COALESCE(description, '')));

-- 搜索查询
SELECT
  id,
  title,
  description,
  price,
  original_price,
  discount,
  merchant,
  image_url,
  published_at,
  ts_rank(to_tsvector('german', title || ' ' || COALESCE(description, '')),
          plainto_tsquery('german', $1)) AS rank
FROM deals
WHERE
  to_tsvector('german', title || ' ' || COALESCE(description, ''))
  @@ plainto_tsquery('german', $1)
  AND expires_at > NOW()
ORDER BY rank DESC, published_at DESC
LIMIT $2 OFFSET $3;
```

#### GET /api/stats

**功能**: 获取站点统计数据

**SQL 查询**:
```sql
-- 总优惠数
SELECT COUNT(*) AS total_deals
FROM deals
WHERE expires_at > NOW();

-- 今日新增
SELECT COUNT(*) AS today_deals
FROM deals
WHERE DATE(created_at) = CURRENT_DATE;

-- 活跃商家数
SELECT COUNT(DISTINCT merchant) AS active_merchants
FROM deals
WHERE merchant IS NOT NULL AND expires_at > NOW();

-- 平均折扣
SELECT AVG(discount) AS avg_discount
FROM deals
WHERE discount IS NOT NULL AND expires_at > NOW();
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "totalDeals": 1234,
    "todayDeals": 56,
    "activeMerchants": 89,
    "avgDiscount": 32.5
  }
}
```

**缓存策略**:
```typescript
const cacheKey = 'stats:global'
const cacheTTL = 600  // 10 分钟
```

---

## 五、数据层设计

### 5.1 数据库查询优化

#### 索引策略
```sql
-- 已存在的索引 (从 STEP3 继承)
CREATE INDEX IF NOT EXISTS idx_deals_source_site ON deals(source_site);
CREATE INDEX IF NOT EXISTS idx_deals_content_hash ON deals(content_hash)
  WHERE content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_merchant ON deals(merchant)
  WHERE merchant IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_published_at ON deals(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_translation_status ON deals(translation_status);
CREATE INDEX IF NOT EXISTS idx_deals_expires_at ON deals(expires_at)
  WHERE expires_at IS NOT NULL;

-- 新增索引 (Step5 优化)
CREATE INDEX IF NOT EXISTS idx_deals_price ON deals(price)
  WHERE price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_discount ON deals(discount DESC)
  WHERE discount IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_categories_gin ON deals
  USING gin(categories);
CREATE INDEX IF NOT EXISTS idx_deals_tags_gin ON deals
  USING gin(tags);
```

#### 查询性能目标
- 列表查询 (20 条): < 50ms
- 详情查询 (单条): < 20ms
- 搜索查询 (20 条): < 100ms
- 统计查询: < 50ms (使用缓存)

### 5.2 数据库连接管理

```typescript
// packages/web/src/lib/db.ts
import { Pool } from 'pg'

let pool: Pool | null = null

export function getDbPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true',
      max: 20,                    // 最大连接数
      idleTimeoutMillis: 30000,   // 空闲连接超时 30s
      connectionTimeoutMillis: 5000,  // 连接超时 5s
    })
  }
  return pool
}

export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  const pool = getDbPool()
  const result = await pool.query(sql, params)
  return result.rows
}
```

### 5.3 ORM 选型 (可选)

**建议**: 暂不引入 ORM,直接使用原生 SQL

**理由**:
- 性能优先 (避免 ORM 查询转换开销)
- 查询复杂度高 (JSONB 操作, 全文搜索)
- 学习成本低 (团队已熟悉 SQL)

如需引入 ORM,建议使用:
- Prisma (类型安全,迁移管理)
- Drizzle ORM (轻量级,性能接近原生 SQL)

---

## 六、缓存策略

### 6.1 多层缓存架构

```
┌──────────────────────────────────────────┐
│  CDN Cache (Cloudflare/Vercel)          │
│  - 静态资源 (images, CSS, JS)            │
│  - 静态页面 (首页, 分类页)               │
│  TTL: 1 hour                             │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│  Next.js ISR Cache (Vercel/Self-hosted) │
│  - 页面级别缓存                          │
│  - revalidate: 300s (首页)               │
│  - revalidate: 600s (详情页)             │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│  Redis Cache (Application Level)        │
│  - API 响应缓存                          │
│  - 热门查询缓存                          │
│  TTL: 300-600s (根据数据类型)            │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│  PostgreSQL (Source of Truth)           │
│  - 原始数据                              │
└──────────────────────────────────────────┘
```

### 6.2 Redis 缓存实现

```typescript
// packages/web/src/lib/cache.ts
import Redis from 'ioredis'

let redis: Redis | null = null

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          return null  // 停止重试
        }
        return Math.min(times * 100, 2000)  // 指数退避
      },
      lazyConnect: true,
    })

    redis.on('error', (err) => {
      console.error('Redis connection error:', err)
    })
  }
  return redis
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis()
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error('Cache get error:', error)
    return null  // 降级：返回 null,从数据库查询
  }
}

export async function cacheSet(
  key: string,
  value: any,
  ttl: number = 300
): Promise<void> {
  try {
    const redis = getRedis()
    await redis.setex(key, ttl, JSON.stringify(value))
  } catch (error) {
    console.error('Cache set error:', error)
    // 降级：不抛出错误,允许继续执行
  }
}

export async function cacheInvalidate(pattern: string): Promise<void> {
  try {
    const redis = getRedis()
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (error) {
    console.error('Cache invalidate error:', error)
  }
}
```

### 6.3 缓存失效策略

#### 主动失效
```typescript
// Worker 写入新 Deal 时,主动通知 Web 端失效缓存
export async function onDealCreated(deal: Deal) {
  // 失效列表缓存
  await cacheInvalidate('deals:list:*')

  // 失效统计缓存
  await cacheInvalidate('stats:*')

  // 失效分类缓存 (如果 deal 有新分类)
  if (deal.categories.length > 0) {
    await cacheInvalidate('categories:*')
  }
}

// Worker 更新 Deal 时
export async function onDealUpdated(dealId: string) {
  // 失效详情缓存
  await cacheInvalidate(`deals:detail:${dealId}`)

  // 失效相关列表缓存
  await cacheInvalidate('deals:list:*')
}
```

#### 被动失效
- TTL 到期自动失效
- LRU 策略 (Redis maxmemory-policy: allkeys-lru)

---

## 七、SEO 优化

### 7.1 结构化数据标记

#### Product Schema (优惠详情页)
```tsx
// packages/web/src/components/StructuredData/ProductSchema.tsx
export function ProductSchema({ deal }: { deal: Deal }) {
  const schema = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: deal.title,
    description: deal.description,
    image: deal.imageUrl,
    brand: {
      '@type': 'Brand',
      name: deal.merchant,
    },
    offers: {
      '@type': 'Offer',
      url: deal.link,
      priceCurrency: deal.currency,
      price: deal.price,
      priceValidUntil: deal.expiresAt,
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: deal.merchant,
      },
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

#### BreadcrumbList Schema
```tsx
export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: item.href ? `${process.env.NEXT_PUBLIC_SITE_URL}${item.href}` : undefined,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

### 7.2 Meta 标签生成

```tsx
// packages/web/src/app/deals/[id]/page.tsx
export async function generateMetadata({
  params
}: {
  params: { id: string }
}): Promise<Metadata> {
  const deal = await fetchDealById(params.id)

  if (!deal) {
    return {
      title: '优惠未找到 - MoreYuDeals',
    }
  }

  return {
    title: `${deal.title} - MoreYuDeals`,
    description: deal.description.slice(0, 160),
    openGraph: {
      title: deal.title,
      description: deal.description,
      images: [
        {
          url: deal.imageUrl,
          width: 1200,
          height: 630,
          alt: deal.title,
        },
      ],
      type: 'website',
      url: `https://moreyudeals.com/deals/${deal.id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: deal.title,
      description: deal.description,
      images: [deal.imageUrl],
    },
    alternates: {
      canonical: `https://moreyudeals.com/deals/${deal.id}`,
    },
  }
}
```

### 7.3 Sitemap 生成

```typescript
// packages/web/src/app/sitemap.ts
import { MetadataRoute } from 'next'
import { getDbPool } from '@/lib/db'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://moreyudeals.com'
  const pool = getDbPool()

  // 获取所有优惠
  const deals = await pool.query<{ id: string; updated_at: string }>(
    'SELECT id, updated_at FROM deals WHERE expires_at > NOW() ORDER BY updated_at DESC LIMIT 1000'
  )

  // 获取所有分类
  const categories = await pool.query<{ slug: string }>(
    'SELECT DISTINCT jsonb_array_elements_text(categories) AS slug FROM deals'
  )

  return [
    // 静态页面
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: `${baseUrl}/deals`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },

    // 优惠详情页
    ...deals.rows.map((deal) => ({
      url: `${baseUrl}/deals/${deal.id}`,
      lastModified: new Date(deal.updated_at),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),

    // 分类页
    ...categories.rows.map((cat) => ({
      url: `${baseUrl}/categories/${cat.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
  ]
}
```

### 7.4 Robots.txt

```typescript
// packages/web/src/app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/'],
      },
      {
        userAgent: 'GPTBot',  // 禁止 AI 爬虫
        disallow: '/',
      },
    ],
    sitemap: 'https://moreyudeals.com/sitemap.xml',
  }
}
```

---

## 八、性能优化

### 8.1 图片优化

#### Next.js Image 组件配置
```typescript
// packages/web/next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.sparhamster.at',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7,  // 7 days
  },
}
```

#### 图片使用规范
```tsx
// ✅ 正确：使用 Next.js Image 组件
<Image
  src={deal.imageUrl}
  alt={deal.title}
  width={800}
  height={450}
  loading="lazy"
  placeholder="blur"
  blurDataURL={generateBlurDataURL(deal.imageUrl)}
  className="rounded-lg"
/>

// ❌ 错误：直接使用 <img> 标签
<img src={deal.imageUrl} alt={deal.title} />
```

### 8.2 代码分割与懒加载

```tsx
// 懒加载重量级组件
const DealDetail = dynamic(() => import('@/components/DealDetail'), {
  loading: () => <DealDetailSkeleton />,
  ssr: true,
})

const SearchModal = dynamic(() => import('@/components/SearchModal'), {
  loading: () => null,
  ssr: false,  // 仅客户端渲染
})

// 路由级别代码分割 (Next.js 自动处理)
// pages/deals/[id].tsx → 自动分割为独立 chunk
```

### 8.3 资源预加载

```tsx
// packages/web/src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        {/* 预连接关键域名 */}
        <link rel="preconnect" href={process.env.DB_HOST} />
        <link rel="dns-prefetch" href="https://www.sparhamster.at" />

        {/* 预加载关键资源 */}
        <link
          rel="preload"
          href="/fonts/inter-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### 8.4 性能监控

```typescript
// packages/web/src/lib/analytics.ts
export function reportWebVitals(metric: any) {
  // 发送到 Vercel Analytics / Google Analytics
  if (metric.label === 'web-vital') {
    console.log(metric)

    // 发送到后端
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(console.error)
  }
}
```

**目标指标**:
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1
- FCP (First Contentful Paint): < 1.8s
- TTFB (Time to First Byte): < 600ms

---

## 九、错误处理与降级

### 9.1 API 错误处理

```typescript
// packages/web/src/lib/api-client.ts
export async function fetchWithRetry<T>(
  url: string,
  options?: RequestInit,
  retries = 3
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      if (i === retries - 1) {
        throw error
      }

      // 指数退避
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
    }
  }

  throw new Error('Max retries reached')
}
```

### 9.2 UI 降级策略

```tsx
// 数据库/缓存失败时显示静态数据
export default async function HomePage() {
  let deals = []
  let error = null

  try {
    deals = await fetchLatestDeals()
  } catch (e) {
    error = e
    deals = fallbackDeals  // 静态备用数据
  }

  return (
    <>
      {error && <ErrorBanner message="数据加载失败,正在显示缓存数据" />}
      <DealsGrid deals={deals} />
    </>
  )
}
```

### 9.3 错误边界

```tsx
// packages/web/src/components/ErrorBoundary.tsx
'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo)

    // 发送到错误追踪服务
    fetch('/api/errors', {
      method: 'POST',
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        info: errorInfo,
      }),
    }).catch(console.error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">出错了</h1>
            <p className="text-gray-600 mb-4">
              页面加载失败,请刷新页面重试
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg"
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

---

## 十、国际化 (i18n)

### 10.1 语言支持

**初版支持**:
- 🇨🇳 中文 (zh-CN) - 主要语言
- 🇩🇪 德语 (de-DE) - 原文语言

**未来扩展**:
- 🇺🇸 英语 (en-US)
- 🇦🇹 奥地利德语 (de-AT)

### 10.2 语言切换实现

```typescript
// packages/web/src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 从 Cookie 或 Header 获取语言偏好
  const locale = request.cookies.get('locale')?.value ||
                request.headers.get('accept-language')?.split(',')[0] ||
                'zh-CN'

  // 存储到请求头供后续使用
  const response = NextResponse.next()
  response.headers.set('x-locale', locale)

  return response
}
```

### 10.3 翻译文案管理

```typescript
// packages/web/src/i18n/messages/zh-CN.ts
export const messages = {
  common: {
    loading: '加载中...',
    error: '出错了',
    retry: '重试',
    viewDetails: '查看详情',
  },
  deals: {
    title: '所有优惠',
    featured: '精选优惠',
    latest: '最新优惠',
    discount: '折扣',
    expires: '有效期至',
    expired: '已过期',
  },
  // ...
}

// packages/web/src/i18n/messages/de-DE.ts
export const messages = {
  common: {
    loading: 'Laden...',
    error: 'Fehler',
    retry: 'Wiederholen',
    viewDetails: 'Details anzeigen',
  },
  // ...
}
```

---

## 十一、测试策略

### 11.1 测试类型

```
┌─────────────────────────────────────────┐
│  E2E 测试 (Playwright)                   │
│  - 用户完整流程测试                      │
│  - 关键路径覆盖                          │
│  覆盖率目标: 80% 关键场景                │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  集成测试 (Jest + Testing Library)      │
│  - 页面级别测试                          │
│  - API 端点测试                          │
│  覆盖率目标: 70%                         │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  单元测试 (Jest)                         │
│  - 组件测试                              │
│  - 工具函数测试                          │
│  覆盖率目标: 90%                         │
└─────────────────────────────────────────┘
```

### 11.2 测试示例

#### 单元测试 (组件)
```typescript
// packages/web/src/components/__tests__/DealCard.test.tsx
import { render, screen } from '@testing-library/react'
import DealCard from '../DealCard'

describe('DealCard', () => {
  const mockDeal = {
    id: '1',
    title: 'Test Deal',
    price: 99.99,
    originalPrice: 149.99,
    discount: 33,
    imageUrl: 'https://example.com/image.jpg',
    merchant: 'Amazon',
  }

  it('renders deal title', () => {
    render(<DealCard deal={mockDeal} />)
    expect(screen.getByText('Test Deal')).toBeInTheDocument()
  })

  it('displays correct discount percentage', () => {
    render(<DealCard deal={mockDeal} />)
    expect(screen.getByText('-33%')).toBeInTheDocument()
  })

  it('shows current and original price', () => {
    render(<DealCard deal={mockDeal} />)
    expect(screen.getByText('€99.99')).toBeInTheDocument()
    expect(screen.getByText('€149.99')).toBeInTheDocument()
  })
})
```

#### API 测试
```typescript
// packages/web/src/app/api/deals/__tests__/route.test.ts
import { GET } from '../route'
import { NextRequest } from 'next/server'

describe('GET /api/deals', () => {
  it('returns deals list', async () => {
    const request = new NextRequest('http://localhost:3000/api/deals?limit=10')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.data.length).toBeLessThanOrEqual(10)
  })

  it('handles pagination', async () => {
    const request = new NextRequest('http://localhost:3000/api/deals?page=2&limit=20')
    const response = await GET(request)
    const data = await response.json()

    expect(data.pagination.page).toBe(2)
    expect(data.pagination.limit).toBe(20)
  })
})
```

#### E2E 测试
```typescript
// packages/web/e2e/deals-flow.spec.ts
import { test, expect } from '@playwright/test'

test('user can browse and view deal details', async ({ page }) => {
  // 访问首页
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('奥地利优惠信息聚合')

  // 点击第一个优惠卡片
  await page.locator('.deal-card').first().click()

  // 验证详情页
  await expect(page).toHaveURL(/\/deals\/[a-z0-9-]+/)
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('.price')).toBeVisible()

  // 点击查看优惠按钮
  const ctaButton = page.locator('button', { hasText: '查看优惠' })
  await expect(ctaButton).toBeVisible()
})
```

---

## 十二、实施计划

### 12.1 任务分解

#### T1: 数据层重构 (2 天)
- [ ] 创建 `db.ts` 数据库连接管理
- [ ] 实现 API 查询函数 (fetchDeals, fetchDealById, etc.)
- [ ] 添加新索引 (price, discount, categories_gin)
- [ ] 测试查询性能

#### T2: 缓存层实现 (1 天)
- [ ] 创建 `cache.ts` Redis 客户端
- [ ] 实现缓存 get/set/invalidate 函数
- [ ] 添加缓存降级逻辑
- [ ] 测试缓存功能

#### T3: API Routes 开发 (3 天)
- [ ] 实现 `GET /api/deals` (列表)
- [ ] 实现 `GET /api/deals/[id]` (详情)
- [ ] 实现 `GET /api/categories` (分类)
- [ ] 实现 `GET /api/search` (搜索)
- [ ] 实现 `GET /api/stats` (统计)
- [ ] 添加错误处理与日志
- [ ] 编写 API 测试

#### T4: UI 组件开发 (4 天)
- [ ] 实现 `DealCard` 组件
- [ ] 实现 `DealDetail` 组件
- [ ] 实现 `ContentBlocksRenderer` 组件
- [ ] 实现 `Header` 和 `Footer` 组件
- [ ] 实现 `SearchBar` 和 `FilterBar` 组件
- [ ] 实现 `Pagination` 组件
- [ ] 编写组件单元测试

#### T5: 页面开发 (4 天)
- [ ] 重构首页 (`page.tsx`)
- [ ] 重构优惠列表页 (`deals/page.tsx`)
- [ ] 重构优惠详情页 (`deals/[id]/page.tsx`)
- [ ] 实现分类页 (`categories/[slug]/page.tsx`)
- [ ] 实现搜索页 (`search/page.tsx`)
- [ ] 配置 ISR revalidate 时间

#### T6: SEO 优化 (2 天)
- [ ] 添加结构化数据 (Product, Breadcrumb)
- [ ] 生成动态 Meta 标签
- [ ] 实现 `sitemap.ts` 和 `robots.ts`
- [ ] 优化 OG Image 生成
- [ ] 测试 SEO 标记 (Google Rich Results Test)

#### T7: 性能优化 (2 天)
- [ ] 配置 Next.js Image 优化
- [ ] 添加代码分割与懒加载
- [ ] 实现资源预加载
- [ ] 添加性能监控 (Web Vitals)
- [ ] 压力测试 API 端点

#### T8: 错误处理与降级 (1 天)
- [ ] 实现 ErrorBoundary 组件
- [ ] 添加 API 错误处理与重试
- [ ] 添加降级数据 (fallbackDeals)
- [ ] 测试错误场景

#### T9: 测试与文档 (2 天)
- [ ] 编写 E2E 测试 (Playwright)
- [ ] 编写集成测试
- [ ] 更新 README.md
- [ ] 编写部署指南

#### T10: 集成验证与上线 (1 天)
- [ ] 本地环境全流程测试
- [ ] 生产环境冒烟测试
- [ ] 性能基准测试
- [ ] 提交变更报告

**总计**: 22 天 (3 周)

### 12.2 里程碑

| 里程碑 | 日期 | 验收标准 |
|--------|------|----------|
| M1: 数据层完成 | Day 3 | 数据库查询函数可用,性能达标 |
| M2: API 完成 | Day 6 | 所有 API 端点可用,测试通过 |
| M3: UI 组件完成 | Day 10 | 核心组件实现,单元测试通过 |
| M4: 页面完成 | Day 14 | 所有页面可访问,ISR 生效 |
| M5: 优化完成 | Day 18 | SEO 标记完整,性能达标 |
| M6: 上线就绪 | Day 22 | 测试通过,文档完整,可部署 |

---

## 十三、验收标准

### 13.1 功能验收

- [ ] **首页**
  - [ ] 可正常加载,显示 6 个精选优惠
  - [ ] Hero section 和 stats section 正常显示
  - [ ] 分类卡片可点击跳转

- [ ] **优惠列表页**
  - [ ] 分页功能正常 (20 条/页)
  - [ ] 过滤器生效 (分类、商家、价格、折扣)
  - [ ] 排序功能正常 (最新、价格、折扣)
  - [ ] 空状态正常显示

- [ ] **优惠详情页**
  - [ ] content_blocks 正确渲染 (paragraph, list, image, etc.)
  - [ ] 商家 logo 正确显示
  - [ ] 价格、折扣、有效期正确显示
  - [ ] 相关优惠推荐正常显示
  - [ ] 面包屑导航正确

- [ ] **分类页**
  - [ ] 分类列表正确显示
  - [ ] 分类筛选正常工作
  - [ ] 优惠数量统计正确

- [ ] **搜索功能**
  - [ ] 全文搜索正常工作
  - [ ] 搜索结果相关性合理
  - [ ] 空搜索结果正常显示

### 13.2 性能验收

- [ ] **页面加载速度**
  - [ ] 首页 LCP < 2.5s
  - [ ] 列表页 LCP < 3s
  - [ ] 详情页 LCP < 3s

- [ ] **API 响应时间**
  - [ ] GET /api/deals (20 条) < 200ms (P95)
  - [ ] GET /api/deals/[id] < 100ms (P95)
  - [ ] GET /api/search < 300ms (P95)

- [ ] **缓存命中率**
  - [ ] Redis 缓存命中率 > 70%
  - [ ] 热门查询缓存命中率 > 90%

### 13.3 SEO 验收

- [ ] **结构化数据**
  - [ ] Product Schema 通过验证
  - [ ] BreadcrumbList Schema 通过验证
  - [ ] Google Rich Results Test 通过

- [ ] **Meta 标签**
  - [ ] 所有页面有唯一 title
  - [ ] 所有页面有 description
  - [ ] OG 标签完整 (title, description, image)
  - [ ] Twitter Card 标签完整

- [ ] **Sitemap & Robots**
  - [ ] sitemap.xml 可访问,包含所有优惠
  - [ ] robots.txt 正确配置

### 13.4 UI/UX 验收

- [ ] **响应式设计**
  - [ ] 移动端 (< 768px) 布局正常
  - [ ] 平板端 (768-1024px) 布局正常
  - [ ] 桌面端 (> 1024px) 布局正常

- [ ] **交互体验**
  - [ ] 卡片悬停效果流畅
  - [ ] 按钮点击反馈明确
  - [ ] 加载状态有骨架屏
  - [ ] 错误状态有友好提示

- [ ] **浏览器兼容性**
  - [ ] Chrome (最新版) 正常
  - [ ] Safari (最新版) 正常
  - [ ] Firefox (最新版) 正常
  - [ ] Edge (最新版) 正常

### 13.5 代码质量验收

- [ ] **测试覆盖率**
  - [ ] 单元测试覆盖率 > 90%
  - [ ] 集成测试覆盖率 > 70%
  - [ ] E2E 测试覆盖关键场景 (> 80%)

- [ ] **代码规范**
  - [ ] ESLint 无错误
  - [ ] TypeScript 无类型错误
  - [ ] Prettier 格式化通过

- [ ] **文档完整性**
  - [ ] README.md 更新
  - [ ] API 文档完整
  - [ ] 组件文档完整

---

## 十四、风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 数据库查询性能不达标 | 高 | 中 | 优化索引,增加缓存层,查询优化 |
| Redis 缓存失效导致数据库压力 | 高 | 中 | 实现降级逻辑,限流保护,监控告警 |
| ISR 缓存导致数据不一致 | 中 | 中 | 主动失效缓存,缩短 revalidate 时间 |
| content_blocks 渲染异常 | 中 | 中 | 添加容错逻辑,显示备用内容 |
| SEO 优化效果不明显 | 中 | 低 | 持续优化,添加更多结构化数据 |
| 移动端适配问题 | 中 | 低 | 充分测试,响应式设计优先 |
| 第三方 API (Sparhamster) 变更 | 高 | 低 | Worker 层监控,保留旧数据作为备份 |

---

## 十五、后续优化方向

### 阶段 3 (Step6)
- [ ] 商家识别与联盟链接替换
- [ ] 联盟链接白名单配置
- [ ] 点击追踪与收益统计

### 长期优化
- [ ] PWA 支持 (离线访问)
- [ ] 用户收藏与通知功能
- [ ] 个性化推荐算法
- [ ] 多数据源聚合
- [ ] 评论与社区功能
- [ ] 移动端 App

---

## 十六、自检清单

在提交本文档前,请确认:

- [ ] 所有章节都有实质内容 (不是占位符)
- [ ] UI/UX 设计规范明确可执行
- [ ] 页面结构与路由设计完整
- [ ] API 接口设计详细 (包含 SQL 查询)
- [ ] 缓存策略清晰合理
- [ ] SEO 优化方案具体
- [ ] 性能优化措施可量化
- [ ] 测试策略覆盖全面
- [ ] 实施计划有明确时间表
- [ ] 验收标准可验证
- [ ] 风险识别充分,缓解措施合理

---

**文档版本**: v1.0
**创建日期**: 2025-10-13
**作者**: Claude
**审核状态**: ⏳ 待审核
**依赖**: STEP4 完成 (Worker 已稳定运行)
**后续**: STEP6 (联盟链接集成)
