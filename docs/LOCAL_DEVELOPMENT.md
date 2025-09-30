# 本地开发指南 (Local Development Guide)

## 开发流程说明

本项目采用**本地开发优先**的策略：
1. ✅ **本地开发和测试** - 零成本验证功能
2. ✅ **功能完善后** - 再配置生产环境
3. ✅ **降低风险** - 避免前期投入过多成本

## 环境要求

### 系统要求
- macOS / Linux / Windows (WSL2)
- Node.js 18+ LTS
- PostgreSQL 14+
- Redis 6+
- Git

### 开发工具推荐
- VS Code + 相关插件
- Postman (API测试)
- Redis Desktop Manager (Redis管理)
- pgAdmin (PostgreSQL管理)

## 项目结构

```
moreyudeals/
├── docs/                    # 项目文档
├── packages/
│   ├── cms/                 # Strapi CMS后端
│   ├── worker/              # RSS抓取翻译Worker
│   ├── web/                 # Next.js前端
│   └── translation/         # 翻译系统核心库
├── scripts/                 # 开发脚本
├── docker/                  # Docker配置（可选）
├── .env.example            # 环境变量模板
├── package.json            # Monorepo配置
└── README.md
```

## 本地环境搭建步骤

### Step 1: 环境检查
```bash
# 检查Node.js版本
node --version  # 应该 >= 18

# 检查npm或yarn
npm --version
yarn --version

# 检查PostgreSQL
psql --version  # 应该 >= 14

# 检查Redis
redis-server --version  # 应该 >= 6
```

### Step 2: 数据库准备
```bash
# 启动PostgreSQL和Redis
brew services start postgresql  # macOS
brew services start redis       # macOS

# 或者使用系统服务
sudo systemctl start postgresql  # Linux
sudo systemctl start redis      # Linux

# 创建开发数据库
createdb moreyudeals_dev
createdb moreyudeals_test
```

### Step 3: 项目初始化
```bash
# 克隆项目
git clone https://github.com/PRYePR/moreyudeals.git
cd moreyudeals

# 安装依赖（使用yarn workspace）
yarn install

# 或者单独安装各包
cd packages/cms && npm install
cd ../worker && npm install
cd ../web && npm install
cd ../translation && npm install
```

### Step 4: 环境变量配置
```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑环境变量
nano .env.local
```

### Step 5: 启动开发服务
```bash
# 启动所有服务（推荐）
yarn dev

# 或者分别启动
yarn dev:cms      # Strapi CMS (http://localhost:1337)
yarn dev:web      # Next.js前端 (http://localhost:3000)
yarn dev:worker   # Worker服务
```

## 环境变量配置

### .env.local 示例
```bash
# === 数据库配置 ===
DATABASE_URL="postgresql://username:password@localhost:5432/moreyudeals_dev"
REDIS_URL="redis://localhost:6379"

# === Strapi配置 ===
STRAPI_HOST=localhost
STRAPI_PORT=1337
STRAPI_API_TOKEN=your-dev-token

# === 翻译API配置（本地开发） ===
# DeepL (使用免费版测试)
DEEPL_API_KEY=your-deepl-free-key
DEEPL_ENDPOINT=https://api-free.deepl.com/v2/translate

# Microsoft Translator (免费额度)
MS_TRANSLATOR_KEY=your-ms-key
MS_TRANSLATOR_REGION=eastus

# Google Translate (免费额度)
GOOGLE_TRANSLATE_KEY=your-google-key

# === 翻译配置 ===
TRANSLATION_PRIMARY=deepl
TRANSLATION_FALLBACK=microsoft
TRANSLATION_CACHE_ENABLED=true

# === RSS配置 ===
RSS_SOURCE_URL=https://www.sparhamster.at/feed/
RSS_FETCH_INTERVAL=900  # 15分钟

# === 开发模式配置 ===
NODE_ENV=development
LOG_LEVEL=debug
MOCK_TRANSLATION=false  # 是否模拟翻译（开发时可设为true）
```

## 开发工作流

### 日常开发命令
```bash
# 启动开发环境
yarn dev

# 运行测试
yarn test
yarn test:watch     # 监听模式

# 代码检查
yarn lint
yarn lint:fix       # 自动修复

# 数据库操作
yarn db:migrate     # 运行数据库迁移
yarn db:seed        # 填充测试数据
yarn db:reset       # 重置数据库

# 构建项目
yarn build
yarn build:cms
yarn build:web
```

### 翻译系统测试
```bash
# 测试单个翻译Provider
yarn test:translation:deepl
yarn test:translation:microsoft

# 测试翻译路由
yarn test:translation:router

# 测试RSS抓取
yarn test:rss:fetch
```

## 调试技巧

### 1. Strapi CMS调试
```bash
# 访问Admin面板
http://localhost:1337/admin

# API调试
http://localhost:1337/api/articles
http://localhost:1337/api/sources
```

### 2. 翻译系统调试
```bash
# 启用详细日志
LOG_LEVEL=debug yarn dev:worker

# 测试翻译API
curl -X POST http://localhost:3001/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hallo Welt", "from": "de", "to": "zh"}'
```

### 3. Redis调试
```bash
# 连接Redis CLI
redis-cli

# 查看缓存
KEYS translation:*
GET translation:hash123
```

## 常见问题解决

### 数据库连接问题
```bash
# 检查PostgreSQL状态
brew services list | grep postgresql

# 检查端口占用
lsof -i :5432

# 重启PostgreSQL
brew services restart postgresql
```

### Redis连接问题
```bash
# 检查Redis状态
redis-cli ping  # 应该返回PONG

# 检查Redis配置
redis-cli CONFIG GET "*"
```

### 端口冲突
```bash
# 检查端口占用
lsof -i :1337  # Strapi
lsof -i :3000  # Next.js
lsof -i :3001  # Worker API

# 终止占用进程
kill -9 <PID>
```

## 数据管理

### 测试数据
```bash
# 导入测试RSS数据
yarn seed:rss

# 导入测试翻译数据
yarn seed:translations

# 清空数据
yarn db:clean
```

### 数据备份
```bash
# 导出开发数据
pg_dump moreyudeals_dev > backup/dev_$(date +%Y%m%d).sql

# 导入数据
psql moreyudeals_dev < backup/dev_20250928.sql
```

## 下一步：部署到生产环境

当本地开发完成并测试通过后，参考以下文档进行生产部署：
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 生产环境部署指南
- [OPERATIONS.md](./OPERATIONS.md) - 运维监控指南

---

**开发状态追踪**
- [ ] 本地环境搭建完成
- [ ] Strapi CMS运行正常
- [ ] 翻译系统测试通过
- [ ] RSS抓取功能正常
- [ ] 前端页面显示正确
- [ ] 集成测试通过
- [ ] 准备部署到生产环境