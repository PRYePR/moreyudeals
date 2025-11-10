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
- pnpm (推荐) 或 yarn
- Git

### 开发工具推荐
- VS Code + 相关插件
- Postman (API测试)
- pgAdmin (PostgreSQL管理)

## 项目结构

```
moreyudeals/
├── docs/                    # 项目文档
├── packages/
│   ├── api/                 # Express API服务器
│   ├── worker/              # RSS抓取翻译Worker
│   ├── web/                 # Next.js前端
│   ├── translation/         # 翻译系统核心库
│   └── shared-html/         # HTML解析工具
├── scripts/                 # 开发脚本
├── package.json            # Monorepo配置
└── README.md
```

## 本地环境搭建步骤

### Step 1: 环境检查
```bash
# 检查Node.js版本
node --version  # 应该 >= 18

# 检查pnpm
pnpm --version

# 检查PostgreSQL
psql --version  # 应该 >= 14
```

### Step 2: 数据库准备
```bash
# 启动PostgreSQL
brew services start postgresql  # macOS
# 或
sudo systemctl start postgresql  # Linux

# 创建开发数据库
createdb moreyudeals_dev
```

### Step 3: 项目初始化
```bash
# 克隆项目
git clone <你的仓库地址>
cd Moreyudeals

# 安装依赖（推荐使用pnpm）
pnpm install

# 或使用yarn
yarn install
```

### Step 4: 环境变量配置

创建各包的 `.env` 文件：

**packages/api/.env:**
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=moreyudeals_dev
DB_USER=你的用户名
DB_PASSWORD=

# API配置
PORT=3001
API_KEY=dev_api_key

# 环境
NODE_ENV=development
LOG_LEVEL=debug
```

**packages/worker/.env:**
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=moreyudeals_dev
DB_USER=你的用户名
DB_PASSWORD=

# 抓取配置
FETCH_INTERVAL=30  # 分钟
FETCH_RANDOM_DELAY_MIN=0
FETCH_RANDOM_DELAY_MAX=5

# Sparhamster API 配置
SPARHAMSTER_API_URL=https://www.sparhamster.at/wp-json/wp/v2/posts
SPARHAMSTER_API_LIMIT=40
SPARHAMSTER_BASE_URL=https://www.sparhamster.at
SPARHAMSTER_TOKEN=your_token
SPARHAMSTER_USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36

# 翻译配置
TRANSLATION_ENABLED=true
TRANSLATION_PROVIDERS=deepl,microsoft
TRANSLATION_BATCH_SIZE=10
TRANSLATION_TARGET_LANGUAGES=zh,en

# DeepL API 配置
DEEPL_API_KEY=your_deepl_key
DEEPL_ENDPOINT=https://api-free.deepl.com/v2

# Microsoft Translator 配置
MICROSOFT_TRANSLATOR_KEY=your_microsoft_key
MICROSOFT_TRANSLATOR_REGION=your_region
MICROSOFT_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com

# 日志
LOG_LEVEL=debug
NODE_ENV=development
```

**packages/web/.env.local:**
```env
# API配置
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_KEY=dev_api_key

# 环境
NODE_ENV=development
```

### Step 5: 初始化数据库
```bash
# 运行数据库迁移
# 创建表结构
psql -d moreyudeals_dev -f packages/api/migrations/001_create_deals_table.sql
```

### Step 6: 启动开发服务
```bash
# 启动所有服务（推荐）
npm run dev

# 这会同时启动：
# - API服务器 (http://localhost:3001)
# - Web前端 (http://localhost:3000)
# - Worker服务

# 或者分别启动
npm run dev:api      # API服务器
npm run dev:web      # Next.js前端
npm run dev:worker   # Worker服务
```

## 开发工作流

### 日常开发命令
```bash
# 启动开发环境
npm run dev

# 运行测试
npm test

# 代码检查
npm run lint
npm run lint:fix       # 自动修复

# 构建项目
npm run build
npm run build:api
npm run build:web
npm run build:worker
```

### API 测试
```bash
# 测试健康检查
curl http://localhost:3001/api/health

# 获取deals列表
curl http://localhost:3001/api/deals?page=1&limit=10

# 按商家筛选
curl http://localhost:3001/api/deals?merchant=Amazon

# 按分类筛选
curl http://localhost:3001/api/deals?category=electronics
```

### Worker 测试
```bash
# 手动触发抓取
cd packages/worker
npm run fetch

# 查看日志
tail -f ../../logs/worker-out.log
```

## 调试技巧

### 1. API服务器调试
```bash
# 启用详细日志
LOG_LEVEL=debug npm run dev:api

# 使用VS Code调试
# 在 .vscode/launch.json 配置：
{
  "type": "node",
  "request": "launch",
  "name": "Debug API",
  "program": "${workspaceFolder}/packages/api/src/index.ts",
  "runtimeArgs": ["-r", "ts-node/register"],
  "env": {
    "NODE_ENV": "development"
  }
}
```

### 2. 翻译系统调试
```bash
# 启用详细日志
LOG_LEVEL=debug npm run dev:worker

# 单独测试翻译功能
cd packages/translation
npm run test
```

### 3. 数据库调试
```bash
# 连接数据库
psql -d moreyudeals_dev

# 查看表
\dt

# 查看deals
SELECT * FROM deals LIMIT 10;

# 查看数据统计
SELECT COUNT(*) FROM deals;
SELECT merchant, COUNT(*) FROM deals GROUP BY merchant;
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

### 端口冲突
```bash
# 检查端口占用
lsof -i :3000  # Next.js
lsof -i :3001  # API

# 终止占用进程
kill -9 <PID>
```

### 翻译API问题
```bash
# 测试DeepL连接
curl -X POST https://api-free.deepl.com/v2/translate \
  -d "auth_key=YOUR_KEY" \
  -d "text=Hello" \
  -d "target_lang=DE"

# 测试Microsoft Translator连接
curl -X POST "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=de" \
  -H "Ocp-Apim-Subscription-Key: YOUR_KEY" \
  -H "Ocp-Apim-Subscription-Region: YOUR_REGION" \
  -H "Content-Type: application/json" \
  -d '[{"Text":"Hello"}]'
```

## 数据管理

### 数据备份
```bash
# 导出开发数据
pg_dump moreyudeals_dev > backup/dev_$(date +%Y%m%d).sql

# 导入数据
psql moreyudeals_dev < backup/dev_20250120.sql
```

### 清空数据
```bash
# 清空deals表
psql -d moreyudeals_dev -c "TRUNCATE TABLE deals CASCADE;"
```

## 下一步：部署到生产环境

当本地开发完成并测试通过后，参考以下文档进行生产部署：
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 生产环境部署指南
- [OPERATIONS.md](./OPERATIONS.md) - 运维监控指南

---

**开发状态追踪**
- [ ] 本地环境搭建完成
- [ ] API服务器运行正常
- [ ] Worker服务运行正常
- [ ] 翻译系统测试通过
- [ ] RSS抓取功能正常
- [ ] 前端页面显示正确
- [ ] 准备部署到生产环境
