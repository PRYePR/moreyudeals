# STEP5 快速参考指南

**用途**: 快速查阅 STEP5 实施要点，辅助开发过程
**完整文档**: 请参考 STEP5_WEB_REDESIGN.md

---

## 🎯 核心目标

1. **UI 复刻** - 90% 还原 Sparhamster 源站 UI/UX
2. **数据切换** - 从 rss_items 切换到 deals 表
3. **性能优化** - API < 200ms, 首屏 < 2s
4. **SEO 优化** - SSR + 结构化数据 + Sitemap

---

## 📐 设计规范速查

### 配色
```css
Primary:  #22c55e (绿色)
Accent:   #f97316 (橙色 - 折扣标签)
Gray:     #6b7280 (次要文字)
Dark:     #111827 (主要文字)
```

### 字体
```css
正文: 16px (1rem)
卡片标题: 20px (1.25rem)
页面标题: 30px (1.875rem)
```

### 响应式断点
```
Mobile:  < 768px  (1 列)
Tablet:  768-1024px (2 列)
Desktop: > 1024px (3 列)
```

---

## 🗂️ 路由结构

```
/                          # 首页 (ISR, 300s)
/deals                     # 优惠列表 (SSR)
/deals/[id]                # 优惠详情 (ISR, 600s)
/categories                # 分类总览 (ISR, 900s)
/categories/[slug]         # 分类详情 (ISR, 900s)
/search?q=...              # 搜索 (CSR)
/about                     # 关于 (Static)

/api/deals                 # GET 列表
/api/deals/[id]            # GET 详情
/api/categories            # GET 分类
/api/search                # GET 搜索
/api/stats                 # GET 统计
```

---

## 🔌 API 快速参考

### GET /api/deals
```typescript
// 查询参数
{
  page?: number      // 页码 (默认 1)
  limit?: number     // 条数 (默认 20, 最大 100)
  category?: string  // 分类过滤
  merchant?: string  // 商家过滤
  sort?: 'latest' | 'price_asc' | 'price_desc' | 'discount'
  minPrice?: number
  maxPrice?: number
  minDiscount?: number
}

// SQL 关键点
WHERE
  categories @> $1::jsonb  -- JSONB 数组包含查询
  AND merchant = $2
  AND price >= $3 AND price <= $4
  AND discount >= $5
  AND expires_at > NOW()
ORDER BY published_at DESC
LIMIT $6 OFFSET $7

// 缓存
cacheKey: 'deals:list:' + JSON.stringify(params)
cacheTTL: 300 (5分钟)
```

### GET /api/deals/[id]
```typescript
// SQL
SELECT * FROM deals WHERE id = $1

// 缓存
cacheKey: 'deals:detail:' + id
cacheTTL: 600 (10分钟)
```

### GET /api/search
```typescript
// 全文搜索 (PostgreSQL)
WHERE to_tsvector('german', title || ' ' || description)
      @@ plainto_tsquery('german', $1)
ORDER BY ts_rank(...) DESC
```

---

## 🧩 关键组件

### DealCard
```tsx
<DealCard>
  ├─ Image (16:9, lazy load)
  │  ├─ Merchant Logo (左上, 40×40px)
  │  └─ Discount Badge (右上, -XX%)
  ├─ Title (2行截断)
  ├─ Price (现价 + 原价删除线)
  └─ Merchant Name (12px灰色)
</DealCard>

// Hover 效果
transform: translateY(-4px)
box-shadow: 0 12px 24px rgba(0,0,0,0.1)
```

### ContentBlocksRenderer
```tsx
// 支持类型
- paragraph: <p>
- heading: <h2>
- list: <ul> / <ol>
- image: <Image>
- blockquote: <blockquote>
- code: <pre><code>

// 使用
<ContentBlocksRenderer blocks={deal.contentBlocks} />
```

---

## 🗄️ 数据库查询模板

### 列表查询 (带过滤)
```sql
SELECT
  id, title, description, price, original_price,
  discount, merchant, merchant_logo, image_url,
  categories, published_at, expires_at
FROM deals
WHERE
  ($1::text IS NULL OR categories @> $1::jsonb)
  AND ($2::text IS NULL OR merchant = $2)
  AND expires_at > NOW()
ORDER BY published_at DESC
LIMIT 20 OFFSET 0;
```

### 详情查询 (完整字段)
```sql
SELECT * FROM deals WHERE id = $1;
```

### 分类统计
```sql
SELECT
  cat AS name,
  COUNT(*) AS count
FROM deals, jsonb_array_elements_text(categories) AS cat
WHERE expires_at > NOW()
GROUP BY cat
ORDER BY count DESC;
```

### 相关推荐
```sql
SELECT id, title, price, image_url
FROM deals
WHERE
  (merchant = $1 OR categories && $2::jsonb)
  AND id != $3
  AND expires_at > NOW()
ORDER BY published_at DESC
LIMIT 6;
```

---

## 💾 缓存策略

### 多层缓存
```
CDN (1 hour)
  ↓
Next.js ISR (300-600s)
  ↓
Redis (300-600s)
  ↓
PostgreSQL
```

### Redis 实现
```typescript
// Get
const cached = await redis.get('deals:list:...')
if (cached) return JSON.parse(cached)

// Set
await redis.setex('deals:list:...', 300, JSON.stringify(data))

// Invalidate
await redis.del(...redis.keys('deals:list:*'))
```

### 缓存失效时机
- Worker 新增 Deal → 失效 `deals:list:*` 和 `stats:*`
- Worker 更新 Deal → 失效 `deals:detail:{id}`
- TTL 到期 → 自动失效

---

## 🔍 SEO 实施清单

### Product Schema
```tsx
<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": deal.title,
  "offers": {
    "@type": "Offer",
    "price": deal.price,
    "priceCurrency": "EUR"
  }
}
</script>
```

### Meta 标签
```tsx
export async function generateMetadata({ params }) {
  const deal = await fetchDealById(params.id)
  return {
    title: `${deal.title} - MoreYuDeals`,
    description: deal.description.slice(0, 160),
    openGraph: {
      title: deal.title,
      images: [deal.imageUrl],
    }
  }
}
```

### Sitemap
```typescript
// app/sitemap.ts
export default async function sitemap() {
  const deals = await fetchAllDeals()
  return deals.map(deal => ({
    url: `https://moreyudeals.com/deals/${deal.id}`,
    lastModified: deal.updatedAt,
    changeFrequency: 'daily',
    priority: 0.7,
  }))
}
```

---

## ⚡ 性能优化清单

### 图片优化
```tsx
// ✅ 使用 Next.js Image
<Image
  src={deal.imageUrl}
  alt={deal.title}
  width={800} height={450}
  loading="lazy"
  placeholder="blur"
/>

// next.config.js
images: {
  formats: ['image/avif', 'image/webp'],
  remotePatterns: [...]
}
```

### 代码分割
```tsx
// 懒加载重组件
const SearchModal = dynamic(() => import('./SearchModal'), {
  ssr: false
})
```

### 预加载
```tsx
// layout.tsx
<link rel="preconnect" href={DB_HOST} />
<link rel="dns-prefetch" href="https://sparhamster.at" />
```

---

## 🧪 测试要点

### 单元测试 (90%)
```typescript
// DealCard.test.tsx
it('renders deal title', () => {
  render(<DealCard deal={mockDeal} />)
  expect(screen.getByText('Test Deal')).toBeInTheDocument()
})
```

### API 测试 (70%)
```typescript
// app/api/deals/route.test.ts
it('returns deals list', async () => {
  const response = await GET(request)
  expect(response.status).toBe(200)
})
```

### E2E 测试 (80% 关键场景)
```typescript
// e2e/deals-flow.spec.ts
test('user can view deal details', async ({ page }) => {
  await page.goto('/')
  await page.locator('.deal-card').first().click()
  await expect(page).toHaveURL(/\/deals\//)
})
```

---

## 📊 验收标准速查

### 性能
- [ ] 首页 LCP < 2.5s
- [ ] API /deals < 200ms (P95)
- [ ] API /deals/[id] < 100ms (P95)

### 功能
- [ ] 优惠列表正常显示 (20条/页)
- [ ] 过滤器生效 (分类/商家/价格/折扣)
- [ ] content_blocks 正确渲染
- [ ] 搜索功能正常

### SEO
- [ ] Product Schema 验证通过
- [ ] 所有页面有唯一 title/description
- [ ] sitemap.xml 可访问

### UI/UX
- [ ] 移动端响应式正常
- [ ] 卡片 hover 效果流畅
- [ ] 加载有骨架屏
- [ ] 错误有友好提示

---

## 🚀 快速启动命令

### 开发
```bash
# 安装依赖
cd packages/web
npm install

# 启动 Redis (缓存)
redis-server &

# 启动开发服务器
npm run dev

# 访问
open http://localhost:3000
```

### 测试
```bash
# 单元测试
npm test

# E2E 测试
npm run test:e2e

# 测试覆盖率
npm test -- --coverage
```

### 构建
```bash
# 生产构建
npm run build

# 本地预览
npm run start
```

---

## 🔧 常见问题

### Q: 数据库连接失败？
```bash
# 检查环境变量
cat .env.local | grep DB_

# 测试连接
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM deals;"
```

### Q: Redis 缓存不生效？
```bash
# 检查 Redis 服务
redis-cli ping

# 查看缓存键
redis-cli keys "deals:*"

# 清空缓存
redis-cli flushdb
```

### Q: 图片无法加载？
```typescript
// 检查 next.config.js 中的 remotePatterns
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'www.sparhamster.at' },
    { protocol: 'https', hostname: '**.amazonaws.com' },
  ]
}
```

### Q: content_blocks 渲染错误？
```typescript
// 确保 JSONB 字段正确解析
// database.ts 中不要 JSON.parse() JSONB 字段
contentBlocks: (row.content_blocks as any) || undefined
```

---

## 📚 相关文档

- **完整设计**: STEP5_WEB_REDESIGN.md
- **数据库架构**: STEP3_DB_SCHEMA.md
- **Worker 实现**: STEP4_WORKER_IMPL.md
- **项目总览**: REBOOT_PLAN.md

---

**版本**: v1.0
**更新日期**: 2025-10-13
**作者**: Claude
