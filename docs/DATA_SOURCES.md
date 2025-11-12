# 数据源配置 (Data Sources)

本项目支持多个德语优惠数据源的自动抓取。

## 支持的数据源

### 1. Sparhamster (奥地利)
- **网站**: https://www.sparhamster.at
- **类型**: WordPress REST API
- **内容**: 奥地利本地优惠折扣信息

### 2. Preisjaeger (德国/奥地利)
- **网站**: https://www.preisjaeger.at
- **类型**: HTML爬虫
- **内容**: 德国和奥地利优惠、促销、折扣码

---

## Sparhamster 配置

### 环境变量
```bash
# 启用/禁用
SPARHAMSTER_ENABLED=true

# API配置
SPARHAMSTER_API_URL=https://www.sparhamster.at/wp-json/wp/v2/posts
SPARHAMSTER_API_LIMIT=20
SPARHAMSTER_BASE_URL=https://www.sparhamster.at

# 抓取间隔 (秒)
FETCH_INTERVAL=300
FETCH_RANDOM_DELAY=120
```

### 数据流程
1. 通过 WordPress REST API 获取文章列表
2. 提取商品信息（标题、价格、商家等）
3. 去重检查（基于文章 ID）
4. 写入数据库
5. 翻译队列处理

---

## Preisjaeger 配置

### 环境变量
```bash
# 启用/禁用
PREISJAEGER_ENABLED=true

# 列表页配置
PREISJAEGER_LIST_URL=https://www.preisjaeger.at/neu
PREISJAEGER_BASE_URL=https://www.preisjaeger.at

# 详情页配置
PREISJAEGER_MAX_DETAIL_PAGES=3         # 每次抓取详情页数量限制
PREISJAEGER_DETAIL_MIN_DELAY=2000      # 详情页请求最小间隔 (ms)
PREISJAEGER_DETAIL_MAX_DELAY=4000      # 详情页请求最大间隔 (ms)

# Amazon联盟标签
AMAZON_AFFILIATE_TAG=moreyu0a-21
```

### 抓取流程
Preisjaeger 采用**列表页优先、详情页补充**的策略：

#### 1. 列表页抓取
- 访问: `https://www.preisjaeger.at/neu`
- 解析 HTML 提取商品列表
- 获取基本信息：
  - 标题、价格、商家
  - **简述**（从 `.userHtml-content` 提取）
  - 缩略图、热度、评论数

#### 2. 去重检查
- 基于 `thread_id` 检查是否已存在
- 基于内容 hash 防止重复

#### 3. 写入数据库
- 使用列表页的**简述**作为初始描述
- 保存为 `original_description` (德语)

#### 4. 详情页抓取（NEW商品）
- 仅对**新增商品**抓取详情页
- 限制数量（`MAX_DETAIL_PAGES`）
- 随机延迟防止封禁
- 补充信息：
  - 发布时间 (`publishedAt`)
  - 过期时间 (`expiresAt`)
  - 完整描述（如果详情页有）

#### 5. 描述处理逻辑
- 如果详情页有完整描述 → 替换列表页简述
- 如果详情页描述为空 → 保留列表页简述

### 特殊功能：链接解密

Preisjaeger 使用加密跳转链接：
```
https://www.preisjaeger.at/visit/homenew/{threadId}
```

**解决方案**：`PreisjaegerLinkResolver` 服务
- 通过 HTTP 重定向跟踪获取真实链接
- 清理 Amazon URL（提取 ASIN）
- 自动添加联盟标签 `moreyu0a-21`

**示例**：
```
加密链接: https://www.preisjaeger.at/visit/homenew/355507
    ↓ 解析
真实链接: https://www.amazon.de/dp/B0BSXMN2H1
    ↓ 清理
最终链接: https://www.amazon.de/dp/B0BSXMN2H1?tag=moreyu0a-21
```

### 分类映射

Preisjaeger 使用德语分类，需要映射到中文：

**配置文件**: `packages/worker/src/config/category-mapping.ts`

```typescript
export const CATEGORY_MAPPING: Record<string, string> = {
  'Elektronik': '数码电子',
  'Gaming': '游戏',
  'Haushalt': '家居用品',
  'Mode & Accessoires': '时尚配饰',
  // ... 更多映射
};
```

**映射逻辑**：
- 优先匹配主分类
- 如果未匹配，使用子分类
- 都未匹配则使用"其他"

---

## 开发和测试

### 本地测试配置 (`.env.local`)
```bash
# 开发环境建议：只启用一个数据源
SPARHAMSTER_ENABLED=false
PREISJAEGER_ENABLED=true

# 限制详情页抓取，避免封禁
PREISJAEGER_MAX_DETAIL_PAGES=3

# 缩短间隔，快速测试
FETCH_INTERVAL=60
```

### 查看抓取日志
```bash
# Worker 日志
tail -f /tmp/worker.log

# 过滤 Preisjaeger 相关
tail -f /tmp/worker.log | grep -i preisjaeger
```

### 数据库验证
```sql
-- 检查最新抓取的商品
SELECT id, title, LEFT(description, 50) as desc_preview, created_at
FROM deals
ORDER BY created_at DESC
LIMIT 10;

-- 检查描述是否填充
SELECT COUNT(*) as total,
       SUM(CASE WHEN description IS NULL THEN 1 ELSE 0 END) as null_desc,
       SUM(CASE WHEN original_description IS NULL THEN 1 ELSE 0 END) as null_orig
FROM deals
WHERE created_at > NOW() - INTERVAL '1 hour';
```

---

## 故障排查

### Preisjaeger 常见问题

**1. 描述字段为空**
- 检查 HTML 结构是否变化
- 确认 `.userHtml-content` 类名是否存在
- 查看日志：`✓ 提取简述` 是否出现

**2. 详情页 403 错误**
- 请求频率过高，增加延迟
- User-Agent 被封禁，更新配置
- 使用代理（如需要）

**3. 链接解析失败**
- 加密链接格式变化
- 网络超时，增加 timeout
- 检查 `PreisjaegerLinkResolver` 日志

**4. 分类映射错误**
- 新增分类未配置
- 更新 `category-mapping.ts`
- 添加日志查看未映射的分类

---

## 生产环境注意事项

### 1. 合规性
- 遵守目标网站的 robots.txt
- 控制请求频率（建议 >= 2秒）
- 使用合理的 User-Agent

### 2. 防封禁策略
- 随机延迟：`DETAIL_MIN_DELAY` / `DETAIL_MAX_DELAY`
- 限制详情页数量：`MAX_DETAIL_PAGES`
- 分散请求时间：使用 `RandomScheduler`

### 3. 监控指标
- 抓取成功率
- 去重率
- 详情页错误率
- 平均响应时间

### 4. 数据质量
- 定期检查描述字段完整性
- 监控翻译失败率
- 验证链接有效性
