# Moreyu Deals 🛍️

墨鱼折扣 (Moreyu Deals) —— 德语优惠信息自动化聚合平台

专注德国本地优惠，自动抓取 + 智能翻译 + 实时发布

---

## 🚀 项目特色

- **自动化抓取** - 定时从 Sparhamster 抓取最新优惠
- **智能翻译** - 多 Provider 架构（DeepL/Microsoft），智能路由降低成本
- **无头架构** - Express API + Next.js 前端完全分离
- **性能优化** - Redis 缓存 + PostgreSQL 索引 + ISR 渲染
- **安全合规** - API Key 认证 + Rate Limiting + CORS 白名单

---

## 📁 核心文档

### 开发文档
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — 技术架构和数据模型
- **[LOCAL_DEVELOPMENT.md](./docs/LOCAL_DEVELOPMENT.md)** — 本地开发环境配置
- **[SERVER_OPERATIONS.md](./docs/SERVER_OPERATIONS.md)** — 服务器端操作指令

### 运维文档
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — 部署流程和配置
- **[OPERATIONS.md](./docs/OPERATIONS.md)** — 运维监控和告警
- **[TROUBLESHOOTING-SIMPLE.md](./docs/TROUBLESHOOTING-SIMPLE.md)** — 故障排查手册

### 产品文档
- **[SCOPE.md](./docs/SCOPE.md)** — 项目范围和内容策略
- **[SEO.md](./docs/SEO.md)** — SEO 优化策略
- **[DISCLAIMER.md](./docs/DISCLAIMER.md)** — 机器翻译免责声明

---

## 🏗️ 技术架构

### 系统组件

```
用户 → Next.js (Vercel) → Cloudflare Tunnel → API (Express) → PostgreSQL
                                             ↓
                                        Worker (抓取+翻译)
                                             ↓
                                        Redis (缓存)
```

### 技术栈

**前端**
- Next.js 15 + React 18 + TypeScript
- Tailwind CSS + SWR + Zustand
- 部署: Vercel（自动构建和 CDN）

**后端**
- Express + TypeScript（API 服务）
- Node.js + TypeScript（Worker 服务）
- PostgreSQL（主数据库）
- Redis（翻译缓存）
- PM2（进程管理）

**基础设施**
- 腾讯云轻量服务器（API + Worker + 数据库）
- Cloudflare Tunnel（安全隧道，隐藏服务器 IP）
- Vercel（前端托管）

---

## 📦 Monorepo 结构

```
moreyudeals/
├── packages/
│   ├── web/              # Next.js 前端应用
│   ├── api/              # Express API 服务
│   ├── worker/           # 抓取和翻译 Worker
│   ├── translation/      # 翻译服务包（多 Provider）
│   └── shared-html/      # 共享 HTML 处理工具
├── scripts/              # 部署和运维脚本
├── docs/                 # 项目文档
└── package.json          # Monorepo 配置
```

---

## 📋 快速开始

### 环境要求
- Node.js 20+
- PostgreSQL 14+
- Redis 6+
- Yarn

### 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/PRYePR/moreyudeals.git
cd moreyudeals

# 2. 安装依赖
yarn install

# 3. 配置环境变量
# 复制并编辑各服务的 .env 文件
cp packages/api/.env.example packages/api/.env
cp packages/worker/.env.example packages/worker/.env

# 4. 启动数据库
# 确保 PostgreSQL 和 Redis 已运行

# 5. 启动开发服务器
yarn dev:web    # 前端 (3000)
yarn dev:api    # API (3001)  - 需要单独终端
yarn dev:worker # Worker      - 需要单独终端
```

访问 http://localhost:3000 查看前端应用

详细配置参考 **[LOCAL_DEVELOPMENT.md](./docs/LOCAL_DEVELOPMENT.md)**

### 生产部署

服务器端部署参考 **[DEPLOYMENT.md](./DEPLOYMENT.md)** 和 **[SERVER_OPERATIONS.md](./docs/SERVER_OPERATIONS.md)**

---

## 🔧 核心功能

### 1. 数据抓取
- 从 Sparhamster API 定时抓取优惠信息
- 自动去重（基于 GUID）
- 商家名称标准化
- 分类自动映射
- 随机调度间隔（防反爬）

### 2. 智能翻译
- **多 Provider 架构**: DeepL（主力） + Microsoft（备用）
- **智能路由**: 根据配额和健康状态自动选择
- **Redis 缓存**: 避免重复翻译，降低成本
- **HTML 保护**: 保留原始标签结构
- **故障转移**: Provider 失败自动切换

### 3. API 服务
- 只读数据库连接（安全）
- API Key 认证
- Rate Limiting（100 req/min）
- CORS 白名单
- 压缩响应

**主要端点**:
- `GET /api/health` - 健康检查
- `GET /api/deals` - 优惠列表（分页、筛选、搜索）
- `GET /api/deals/:id` - 单个优惠详情
- `GET /api/merchants` - 商家列表
- `GET /api/categories` - 分类列表
- `GET /api/stats` - 统计数据

### 4. 前端展示
- **ISR 渲染**: 增量静态再生成，性能最优
- **响应式设计**: 移动端友好
- **瀑布流布局**: Masonry 优惠卡片
- **筛选功能**: 商家、分类交叉筛选
- **SEO 优化**: Meta 标签、结构化数据

---

## 📊 数据模型

### 主表: `deals`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | SERIAL | 主键 |
| `guid` | VARCHAR | 唯一标识（来自源站） |
| `title` | VARCHAR | 中文标题 |
| `title_de` | VARCHAR | 德语原标题 |
| `description` | TEXT | 中文描述 |
| `content_html` | TEXT | 完整内容 HTML |
| `link` | VARCHAR | 源站链接 |
| `merchant` | VARCHAR | 原始商家名 |
| `canonical_merchant_name` | VARCHAR | 标准化商家名 |
| `price` | DECIMAL | 价格 |
| `original_price` | DECIMAL | 原价 |
| `discount` | VARCHAR | 折扣 |
| `categories` | JSONB | 分类数组 |
| `image_url` | VARCHAR | 图片地址 |
| `translation_status` | VARCHAR | `pending`/`completed`/`failed` |
| `translation_provider` | VARCHAR | 翻译引擎 |
| `published_at` | TIMESTAMPTZ | 发布时间 |
| `created_at` | TIMESTAMPTZ | 创建时间 |

**索引**: GUID, 翻译状态, 商家, 发布时间, 分类（GIN）

---

## 🚀 工作流程

### 数据流转

1. **抓取** → Worker 定时从 Sparhamster 抓取优惠
2. **去重** → 基于 GUID 检查是否已存在
3. **入库** → 写入 PostgreSQL (`translation_status = 'pending'`)
4. **翻译** → Translation Worker 检查待翻译内容
5. **缓存** → 查询 Redis 缓存，命中则跳过
6. **调用** → 调用 DeepL/Microsoft API 翻译
7. **更新** → 写回数据库 (`translation_status = 'completed'`)
8. **展示** → Next.js ISR 渲染最新内容

---

## 📈 性能指标

### API 服务
- 响应时间: <200ms (p95)
- 并发能力: 100 req/s
- 可用性: 99.9%

### Worker 服务
- 抓取间隔: 30 分钟（可配置）
- 翻译延迟: <5 分钟
- 成功率: >95%
- 缓存命中率: >60%

### 前端性能
- First Contentful Paint: <1.5s
- Largest Contentful Paint: <2.5s
- Time to Interactive: <3.5s
- Lighthouse Score: >90

---

## 🔒 安全特性

### API 安全
- API Key 认证（所有非公开端点）
- Rate Limiting（防止滥用）
- CORS 白名单（只允许指定域名）
- Helmet 安全头（XSS/Clickjacking 防护）

### 数据库安全
- API 服务使用只读用户
- Worker 服务使用读写用户
- 连接池限制（防止资源耗尽）

### 网络安全
- Cloudflare Tunnel（隐藏服务器 IP）
- HTTPS 加密（自动证书）
- DDoS 防护

---

## 🛠️ 运维操作

### 常用命令

```bash
# 查看服务状态
pm2 list

# 重启服务
pm2 reload moreyudeals-api
pm2 reload moreyudeals-worker

# 查看日志
pm2 logs moreyudeals-api
pm2 logs moreyudeals-worker

# 健康检查
curl http://localhost:3001/api/health

# 部署最新代码
bash scripts/auto-deploy.sh
```

详细操作参考 **[SERVER_OPERATIONS.md](./docs/SERVER_OPERATIONS.md)**

---

## 📊 项目状态

- **当前阶段**: MVP 已上线
- **数据规模**: 1000+ 优惠
- **更新频率**: 每 30 分钟
- **翻译成本**: <$10/月

---

## 📧 联系方式

- **GitHub**: [PRYePR/moreyudeals](https://github.com/PRYePR/moreyudeals)
- **技术支持**: support@moreyu.com
- **法务事务**: legal@moreyu.com

---

## 📄 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件

---

**Powered by AI-driven development | 墨鱼团队 © 2025**
