# 技术架构与数据模型 (ARCHITECTURE)

## 部署架构

| 组件 | 技术选型 | 部署位置 |
|---|---|---|
| 前端 | Next.js（SSG/ISR + Tailwind） | Vercel（Free Tier） |
| 后端 CMS | Strapi（Headless） | 腾讯云轻量服务器（宝塔 + PM2） |
| 数据库 | PostgreSQL | 腾讯云服务器 |
| 抓取/翻译任务 | Node.js 脚本 + 多Provider翻译引擎 | 腾讯云服务器（PM2 cron 定时） |
| 文件存储 | 腾讯云 COS（S3 兼容） | COS Bucket |
| 定时触发 | 本机 cron / PM2 cron | 服务器本地 |
| 网站统计 | Umami | 腾讯云服务器（独立数据库） |

## 数据流
1. 服务器定时脚本拉取 RSS（含 ETag/Last-Modified）。
2. 生成 `checksum`，去重；抽取必要字段。
3. 智能翻译路由：根据内容重要性和配额状况选择最佳翻译Provider（DeepL/Microsoft/Google）。
4. 写入 Strapi/Postgres（图片走 COS 或保留外链）。
5. Next.js 前端通过只读 Token 访问 Strapi API；ISR 渲染与缓存。
6. 用户访问 `deals.moreyu.com` 获取内容。

## Strapi 内容类型（字段蓝图）

### Source
- `name` (string)
- `rssUrl` (string)
- `baseUrl` (string, optional)
- `enabled` (boolean, default true)
- timestamps

### Article（务必包含以下关键字段）
- `source` (relation → Source)
- `sourceUrl` (string, unique)
- `canonicalUrl` (string)
- `status` (enum: draft/published/blocked, default published)
- `publishedAt` (datetime)
- `fetchedAt` (datetime, default now)
- `checksum` (string, indexed)
- `hasFulltext` (boolean, default false)
- `merchantDomain` (string)
- `merchantLink` (string)
- relations: `translations` (one-to-many), `categories` (many-to-many)

### ArticleTranslation
- `article` (relation → Article)
- `locale` (enum: zh/en)
- `title` (string)
- `summaryHtml` (rich text / long text)
- `bodyHtml` (rich text / long text)
- `provider` (enum/string: deepl/gpt/manual)
- `quality` (int 1–5)
- `editedBy` (string)
- timestamps
- **唯一性**：组合唯一（`article` + `locale`）

### Category
- `slug` (UID)
- `nameZh` (string)
- `nameEn` (string)

### Job（可选：任务与告警观测）
- `type` (enum: fetch/translate/publish/retry)
- `payload` (JSON)
- `status` (enum: queued/running/failed/done)
- `attempts` (int)
- `errorText` (text)
- `startedAt` / `finishedAt` / timestamps

## 翻译架构设计

### **核心组件**

#### **TranslationProvider 接口**
```typescript
interface TranslationProvider {
  name: string;
  healthy(): Promise<boolean>;
  translate(input: TranslateInput): Promise<TranslateOutput>;
}

interface TranslateInput {
  text: string[];
  from?: string;
  to: string;
  contentType?: 'text' | 'html';
  priority?: 'high' | 'normal' | 'low';
  glossary?: Record<string, string>;
}
```

#### **Provider实现**
- **DeepLProvider**: 高质量翻译，德语优势
- **MicrosoftProvider**: 2M免费配额，性价比高
- **GoogleProvider**: 应急备用方案
- **GPTProvider**: 未来扩展，高质量但成本高

#### **智能路由器 (SmartRouter)**
- **配额管理**: 实时跟踪各Provider使用量
- **健康检查**: Provider可用性监控
- **故障转移**: 自动降级机制
- **成本优化**: 根据配额选择最经济方案

#### **缓存管理 (CacheManager)**
- **Redis缓存**: 翻译结果缓存，避免重复API调用
- **缓存策略**: 按文本哈希+语言对缓存
- **TTL管理**: 7天过期，热点内容延长

### **目录结构**
```
src/translation/
  ├── providers/
  │   ├── types.ts          # 接口定义
  │   ├── deepl.ts          # DeepL适配器
  │   ├── microsoft.ts      # Microsoft适配器
  │   └── google.ts         # Google适配器
  ├── core/
  │   ├── router.ts         # 智能路由
  │   ├── cache.ts          # 缓存管理
  │   ├── quota.ts          # 配额管理
  │   └── processor.ts      # 文本预处理
  ├── config/
  │   └── providers.json    # Provider配置
  └── index.ts             # 统一导出
```

### **配额管理策略**
```typescript
interface QuotaConfig {
  monthlyLimit: number;     // 月度限额
  currentUsage: number;     // 当前使用量
  costPerChar: number;      // 字符成本
  priority: number;         // 优先级
  healthScore: number;      // 健康分数
}
```

### **翻译质量控制**
- **长度检查**: 翻译结果长度合理性验证
- **HTML完整性**: 标签结构完整性检查
- **术语一致性**: 跨Provider术语表统一处理
- **质量评分**: 基于多维度指标的质量评估

## 前端访问层建议
- 在 Next.js 建立轻薄的 `/api/deals` 中间层（Server Route），统一裁剪字段/缓存/降级，避免页面直接打 Strapi，便于未来替换后端。
