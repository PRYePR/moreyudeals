# 技术架构

> Moreyudeals 实际技术架构和数据模型

---

## 系统架构

### 架构图
```
┌─────────────────────────────────────────────────────────────┐
│                          用户层                              │
│                     deals.moreyu.com                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    前端 (Vercel)                             │
│              Next.js 15 + React 18                           │
│         ISR/SSG + Tailwind CSS + SWR                         │
└─────────────────────────────────────────────────────────────┘
                              │
                    API 调用 (HTTP/HTTPS)
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare Tunnel (可选)                        │
│              安全隧道连接到服务器 API                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│            API 服务 (腾讯云/PM2)                             │
│           Express + TypeScript                               │
│    - 端口: 3001                                              │
│    - API Key 认证                                            │
│    - Rate Limiting                                           │
│    - 只读数据库连接                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│           Worker 服务 (腾讯云/PM2)                           │
│         抓取 + 翻译 + 入库                                    │
│    - Sparhamster Fetcher (RSS 抓取)                         │
│    - Translation Worker (智能翻译)                           │
│    - Random Scheduler (随机间隔调度)                         │
│    - 读写数据库连接                                           │
└─────────────────────────────────────────────────────────────┘
       │                      │                      │
       ↓                      ↓                      ↓
┌────────────┐    ┌────────────────────┐    ┌──────────────┐
│ PostgreSQL │    │  Translation API    │    │    Redis     │
│  数据库     │    │  (DeepL/Microsoft)  │    │  翻译缓存    │
└────────────┘    └────────────────────┘    └──────────────┘
```

---

## 技术栈

### 前端层
| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 15.0.3 | React 框架，SSG/ISR 渲染 |
| React | 18.2.0 | UI 框架 |
| TypeScript | 5.3.3 | 类型安全 |
| Tailwind CSS | 3.3.6 | 样式框架 |
| SWR | 2.2.4 | 数据获取和缓存 |
| Zustand | 5.0.8 | 状态管理 |
| Vercel | - | 部署平台（自动构建） |

### 后端层
| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 20+ | 运行时 |
| Express | 4.18.2 | API 框架 |
| TypeScript | 5.3.3 | 类型安全 |
| PostgreSQL | 14+ | 主数据库 |
| Redis | 6+ | 翻译缓存 |
| PM2 | - | 进程管理 |

### 基础设施
| 组件 | 技术 | 部署位置 |
|------|------|----------|
| 前端 | Next.js | Vercel |
| API 服务 | Express | 腾讯云轻量服务器 |
| Worker 服务 | Node.js | 腾讯云轻量服务器 |
| 数据库 | PostgreSQL | 腾讯云服务器 |
| 缓存 | Redis | 腾讯云服务器 |
| 网络隧道 | Cloudflare Tunnel | - |

---

## 核心服务

### 1. API 服务 (`packages/api`)

**职责**: 为前端提供只读 API

**端口**: 3001

**主要功能**:
- `/api/health` - 健康检查（公开）
- `/api/deals` - 优惠列表（分页、筛选、搜索）
- `/api/deals/:id` - 单个优惠详情
- `/api/merchants` - 商家列表和统计
- `/api/categories` - 分类列表和统计
- `/api/cross-filter` - 交叉筛选数据
- `/api/stats` - 全局统计

**安全特性**:
- API Key 认证（除健康检查外）
- CORS 白名单
- Rate Limiting（默认 100 req/min）
- Helmet 安全头
- 只读数据库连接

**数据库连接**:
- 使用 PostgreSQL Pool 连接
- 只读用户权限
- 连接池最大 20 个连接

### 2. Worker 服务 (`packages/worker`)

**职责**: 抓取、翻译、数据入库

**核心模块**:

#### SparhamsterFetcher
- 从 Sparhamster API 抓取优惠
- 数据标准化和去重
- 商家提取和分类映射
- 图片处理

#### TranslationWorker
- 批量翻译待翻译内容
- 智能 Provider 路由
- 翻译结果缓存
- 失败重试机制

#### RandomScheduler
- 随机间隔调度（防爬虫检测）
- 抓取任务：配置间隔 + 随机延迟
- 翻译任务：配置间隔 + 5分钟随机延迟

**工作流程**:
1. 定时从 Sparhamster 抓取最新优惠
2. 数据去重、标准化、提取商家信息
3. 写入数据库（`translation_status = 'pending'`）
4. 翻译 Worker 定期检查待翻译内容
5. 调用翻译 API 并更新数据库
6. 更新 `translation_status = 'completed'`

### 3. Translation 服务 (`packages/translation`)

**职责**: 统一翻译接口和智能路由

**Provider 实现**:
- **DeepLProvider**: 高质量德语翻译（主力）
- **MicrosoftProvider**: 2M 免费字符配额（备用）
- **GoogleProvider**: 应急方案（未来）

**核心功能**:
- Provider 健康检查
- 配额管理和监控
- Redis 翻译缓存
- 自动故障转移
- HTML 标签保护

---

## 数据模型

### 主表: `deals`

```sql
CREATE TABLE deals (
  -- 主键
  id SERIAL PRIMARY KEY,
  guid VARCHAR(255) UNIQUE NOT NULL,

  -- 基础信息
  title VARCHAR(500) NOT NULL,
  description TEXT,
  link VARCHAR(1000) NOT NULL,
  published_at TIMESTAMPTZ,

  -- 商家信息
  merchant VARCHAR(255),
  canonical_merchant_name VARCHAR(255),
  merchant_link VARCHAR(1000),
  merchant_logo VARCHAR(1000),

  -- 价格信息
  price DECIMAL(10,2),
  original_price DECIMAL(10,2),
  discount VARCHAR(50),
  currency VARCHAR(10) DEFAULT 'EUR',

  -- 分类
  categories JSONB DEFAULT '[]',
  category VARCHAR(255),

  -- 图片
  image_url VARCHAR(1000),

  -- 翻译相关
  translation_status VARCHAR(50) DEFAULT 'pending',
  title_de VARCHAR(500),
  content_html TEXT,
  translated_at TIMESTAMPTZ,
  translation_provider VARCHAR(50),

  -- 联盟链接
  affiliate_link VARCHAR(1000),
  fallback_link VARCHAR(1000),

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_deals_guid ON deals(guid);
CREATE INDEX idx_deals_translation_status ON deals(translation_status);
CREATE INDEX idx_deals_merchant ON deals(canonical_merchant_name);
CREATE INDEX idx_deals_published_at ON deals(published_at DESC);
CREATE INDEX idx_deals_categories ON deals USING GIN(categories);
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `guid` | VARCHAR(255) | 唯一标识符（来自源站） |
| `title` | VARCHAR(500) | 中文标题（翻译后） |
| `title_de` | VARCHAR(500) | 德语原标题 |
| `description` | TEXT | 中文描述 |
| `content_html` | TEXT | 完整 HTML 内容 |
| `link` | VARCHAR(1000) | 源站链接 |
| `canonical_merchant_name` | VARCHAR(255) | 标准化商家名称 |
| `categories` | JSONB | 分类数组 `["超市", "食品"]` |
| `translation_status` | VARCHAR(50) | `pending`/`completed`/`failed` |
| `translation_provider` | VARCHAR(50) | 使用的翻译引擎 |

---

## 数据流

### 1. 抓取流程
```
Sparhamster API
      ↓
SparhamsterFetcher
      ↓
数据标准化 + 去重
      ↓
商家提取 + 分类映射
      ↓
写入 PostgreSQL
(translation_status = 'pending')
```

### 2. 翻译流程
```
定时检查待翻译内容
      ↓
检查 Redis 缓存
      ↓
调用翻译 Provider
      ↓
缓存翻译结果
      ↓
更新数据库
(translation_status = 'completed')
```

### 3. 前端访问流程
```
用户访问 Next.js
      ↓
ISR/SSG 渲染
      ↓
调用 API (http://api-endpoint/api/deals)
      ↓
API 服务查询 PostgreSQL
      ↓
返回 JSON 数据
      ↓
前端渲染展示
```

---

## 翻译架构

### Provider 接口
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
}
```

### 智能路由策略
1. **健康检查**: 优先使用可用的 Provider
2. **配额管理**: Microsoft 免费配额优先
3. **质量优先**: DeepL 德语翻译质量最佳
4. **故障转移**: Provider 失败时自动切换

### 缓存策略
- **Key格式**: `translation:{hash}:{from}:{to}`
- **TTL**: 7天
- **命中率**: 目标 >60%

---

## 网络架构

### Cloudflare Tunnel
- 服务器 API 通过 Cloudflare Tunnel 暴露
- 自动 HTTPS 加密
- DDoS 防护
- 隐藏服务器真实 IP

### 域名配置
- `deals.moreyu.com` → Vercel (前端)
- `api.deals.moreyu.com` → Cloudflare Tunnel → 腾讯云 API (3001)

---

## 部署架构

### PM2 进程
```bash
pm2 list
# moreyudeals-api    - API 服务 (3001)
# moreyudeals-worker - Worker 服务
```

### 环境变量

#### API (`packages/api/.env`)
```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=moreyudeals
DB_USER=moreyudeals_readonly
DB_PASSWORD=***
API_KEY=***
ALLOWED_ORIGINS=https://deals.moreyu.com,http://localhost:3000
```

#### Worker (`packages/worker/.env`)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=moreyudeals
DB_USER=moreyudeals_user
DB_PASSWORD=***
REDIS_URL=redis://localhost:6379
DEEPL_API_KEY=***
MICROSOFT_API_KEY=***
FETCH_INTERVAL=30  # 分钟
TRANSLATION_INTERVAL=10  # 分钟
```

---

## 目录结构

```
moreyudeals/
├── packages/
│   ├── web/              # Next.js 前端
│   ├── api/              # Express API 服务
│   ├── worker/           # 抓取翻译 Worker
│   ├── translation/      # 翻译服务包
│   └── shared-html/      # 共享 HTML 工具
├── scripts/              # 部署和运维脚本
├── docs/                 # 项目文档
└── package.json          # Monorepo 配置
```

---

## 性能指标

### API 服务
- 响应时间: <200ms (p95)
- 并发: 100 req/s
- 可用性: 99.9%

### Worker 服务
- 抓取间隔: 30 分钟（可配置）
- 翻译延迟: <5 分钟
- 成功率: >95%

### 数据库
- 连接池: 20 个连接
- 查询缓存: Redis
- 索引优化: GUID, 商家, 分类, 时间

---

**最后更新**: 2025-11-10
