# Moreyudeals 部署文档

> **部署架构**: 基于Git的服务器端部署
> **环境**: 腾讯云服务器 43.157.40.96 + PostgreSQL 15.5
> **组件**: API服务器 + Worker服务(PM2) + PostgreSQL数据库

---

## 快速开始

```bash
# 服务器上执行
git clone <你的仓库地址> /var/www/Moreyudeals
cd /var/www/Moreyudeals
sudo bash scripts/init-database-server.sh
bash scripts/deploy-server.sh
```

---

## 部署架构

### 开发环境
- **API服务器**: http://localhost:3001
- **Web前端**: http://localhost:3000
- **数据库**: PostgreSQL 本地

### 生产环境
- **Web前端**: Vercel 部署 (https://deals.moreyu.com)
- **API服务器**: 腾讯云服务器 (通过 Cloudflare Tunnel 暴露)
  - 内网端口: 3001
  - 公网域名: https://dealsapi.moreyu.com (通过 Cloudflare Tunnel)
- **Worker服务**: 腾讯云服务器 (PM2 管理)
- **数据库**: PostgreSQL 15.5 (43.157.40.96:5432)

### 网络架构
```
用户
  ↓
Vercel前端 (deals.moreyu.com)
  ↓
Cloudflare Tunnel (dealsapi.moreyu.com)
  ↓
腾讯云API服务器 (localhost:3001)
  ↓
PostgreSQL数据库 (43.157.40.96:5432)
```

---

## 首次部署（服务器端）

### 前置要求

服务器需要安装以下工具：

```bash
# 1. Node.js (v18+)
# 2. pnpm
npm install -g pnpm

# 3. PM2
npm install -g pm2

# 4. PostgreSQL客户端
# Ubuntu/Debian:
sudo apt-get install postgresql-client

# 5. Git
sudo apt-get install git
```

### 部署步骤

#### 1. 克隆代码

```bash
cd /var/www  # 项目目录
git clone <你的仓库地址> Moreyudeals
cd Moreyudeals
```

#### 2. 配置环境变量

**重要**: 服务器使用 `.env` 文件（不是 `.env.production`）

创建生产环境配置文件：

**packages/api/.env:**
```env
# 数据库配置
DB_HOST=43.157.40.96
DB_PORT=5432
DB_NAME=moreyudeals
DB_USER=moreyudeals
DB_PASSWORD=your_db_password

# API配置
PORT=3001
API_KEY=your_production_api_key

# 环境
NODE_ENV=production
LOG_LEVEL=info
```

**packages/worker/.env:**
```env
# 数据库配置
DB_HOST=43.157.40.96
DB_PORT=5432
DB_NAME=moreyudeals
DB_USER=moreyudeals
DB_PASSWORD=your_db_password

# Sparhamster API 配置
SPARHAMSTER_API_URL=https://www.sparhamster.at/wp-json/wp/v2/posts
SPARHAMSTER_API_LIMIT=10
SPARHAMSTER_BASE_URL=https://www.sparhamster.at
SPARHAMSTER_TOKEN=your_token_here
SPARHAMSTER_USER_AGENT=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36

# 重要提示: Sparhamster API 在使用 _embed=true 参数时会返回 500 错误
# fetcher 代码中已移除该参数，无需额外配置

# 抓取配置
FETCH_INTERVAL=60  # 分钟，增加间隔降低被封风险
FETCH_RANDOM_DELAY_MIN=0
FETCH_RANDOM_DELAY_MAX=20  # 增加随机延迟，模拟人类行为

# 翻译配置
TRANSLATION_ENABLED=true
# TRANSLATION_PROVIDERS 控制翻译提供商的优先级顺序
# 格式: provider1,provider2,provider3
# 可用值: microsoft, microsoft2, deepl
# 推荐: microsoft,microsoft2,deepl (优先用Microsoft双Key，避免DeepL配额限制)
TRANSLATION_PROVIDERS=microsoft,microsoft2,deepl
TRANSLATION_BATCH_SIZE=10
TRANSLATION_TARGET_LANGUAGES=zh,en

# DeepL API 配置（可选，如果不配置则不使用DeepL）
DEEPL_API_KEY=your_deepl_key
DEEPL_ENDPOINT=https://api-free.deepl.com/v2

# Microsoft Translator 配置 (主Key)
MICROSOFT_TRANSLATOR_KEY=your_microsoft_key_1
MICROSOFT_TRANSLATOR_REGION=your_region_1
MICROSOFT_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com

# Microsoft Translator 配置 (备用Key)
MICROSOFT_TRANSLATOR_KEY2=your_microsoft_key_2
MICROSOFT_TRANSLATOR_REGION2=your_region_2

# 日志级别
LOG_LEVEL=info
NODE_ENV=production
```

#### 3. 初始化数据库

```bash
# 授予脚本执行权限
chmod +x scripts/*.sh

# 运行数据库初始化（需要 sudo 权限）
sudo bash scripts/init-database-server.sh
```

这个脚本会：
- 创建数据库和用户
- 授予必要的权限
- 执行所有迁移脚本
- 创建表结构和索引

#### 4. 部署服务

```bash
# 运行一键部署脚本
bash scripts/deploy-server.sh
```

部署脚本会：
- 检查系统环境
- 安装项目依赖
- 构建API和Worker项目
- 启动PM2服务

#### 5. 验证部署

```bash
# 查看服务状态
pm2 status

# 查看API服务器日志
pm2 logs moreyudeals-api

# 查看Worker日志
pm2 logs moreyudeals-worker

# 测试API
curl http://localhost:3001/api/health
curl http://localhost:3001/api/deals?page=1&limit=5
```

---

## Cloudflare Tunnel 配置

### 为什么使用 Cloudflare Tunnel？
- ✅ 无需开放服务器端口，更安全
- ✅ 自动 HTTPS 加密
- ✅ DDoS 防护
- ✅ 隐藏服务器真实 IP
- ✅ 免费 CDN 加速

### 安装 Cloudflare Tunnel

```bash
# 1. 安装 cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# 2. 登录 Cloudflare
cloudflared tunnel login
# 会打开浏览器，选择你的域名

# 3. 创建 Tunnel
cloudflared tunnel create moreyudeals-api
# 记下生成的 Tunnel ID

# 4. 创建配置文件
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

### 配置文件内容

```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /root/.cloudflared/<YOUR_TUNNEL_ID>.json

ingress:
  # API 服务器
  - hostname: dealsapi.moreyu.com
    service: http://localhost:3001

  # 404 fallback
  - service: http_status:404
```

### 配置 DNS

```bash
# 在 Cloudflare 添加 DNS 记录（自动）
cloudflared tunnel route dns moreyudeals-api dealsapi.moreyu.com
```

### 启动 Tunnel 服务

```bash
# 测试运行
cloudflared tunnel run moreyudeals-api

# 设置为系统服务
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared

# 查看状态
sudo systemctl status cloudflared

# 查看日志
sudo journalctl -u cloudflared -f
```

### 验证 Tunnel

```bash
# 测试 API 访问
curl https://dealsapi.moreyu.com/api/health

# 应该返回
# {"status":"ok","timestamp":"2025-11-10T..."}
```

### Vercel 前端环境变量

在 Vercel 项目设置中添加：

```env
NEXT_PUBLIC_API_URL=https://dealsapi.moreyu.com
NEXT_PUBLIC_API_KEY=your_production_api_key
```

---

## 日常更新部署

当你在本地开发完成并推送到Git仓库后，在服务器上执行：

```bash
cd /var/www/Moreyudeals

# 快速更新脚本
bash scripts/update-server.sh
```

更新脚本会：
1. 拉取最新代码 (`git pull`)
2. 更新依赖
3. 重新构建项目
4. 重启PM2服务

### 手动更新步骤

如果需要手动控制：

```bash
# 1. 拉取代码
git pull origin main

# 2. 安装依赖
npm ci  # 使用 ci 以确保依赖版本一致

# 3. 构建Worker（如果有 API 服务器也需要构建）
cd packages/worker
npm run build

# 4. 重启服务
pm2 restart moreyudeals-worker
pm2 save
```

---

## PM2 常用命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs moreyudeals-api
pm2 logs moreyudeals-worker

# 实时日志
pm2 logs moreyudeals-api -f

# 重启服务
pm2 restart moreyudeals-api
pm2 restart moreyudeals-worker

# 停止服务
pm2 stop moreyudeals-api
pm2 stop moreyudeals-worker

# 启动服务
pm2 start packages/api/ecosystem.config.js --env production
pm2 start packages/worker/ecosystem.config.js --env production

# 删除服务
pm2 delete moreyudeals-api
pm2 delete moreyudeals-worker

# 保存PM2配置（重启后自动启动）
pm2 save

# 查看详细信息
pm2 show moreyudeals-api
pm2 show moreyudeals-worker
```

---

## 数据库管理

### 连接数据库

```bash
# 本地连接
sudo -u postgres psql -d moreyudeals

# 远程连接（从本地）
PGPASSWORD=338e930fbb psql -h 43.157.40.96 -p 5432 -U moreyudeals -d moreyudeals
```

### 常用SQL命令

```sql
-- 查看所有表
\dt

-- 查看deals表结构
\d deals

-- 查看deals数量
SELECT COUNT(*) FROM deals;

-- 查看最新的deals
SELECT id, title, merchant, created_at
FROM deals
ORDER BY created_at DESC
LIMIT 10;

-- 查看数据库大小
SELECT pg_size_pretty(pg_database_size('moreyudeals'));
```

### 数据库备份

```bash
# 备份数据库
PGPASSWORD=338e930fbb pg_dump -h 43.157.40.96 -p 5432 -U moreyudeals -d moreyudeals > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
PGPASSWORD=338e930fbb psql -h 43.157.40.96 -p 5432 -U moreyudeals -d moreyudeals < backup_20250120_120000.sql
```

---

## 故障排查

### 服务无法启动

1. 检查日志：`pm2 logs moreyudeals-api --err` 或 `pm2 logs moreyudeals-worker --err`
2. 检查配置文件：`cat packages/api/.env` 或 `cat packages/worker/.env`
3. 测试数据库连接：
   ```bash
   PGPASSWORD=338e930fbb psql -h 43.157.40.96 -p 5432 -U moreyudeals -d moreyudeals -c "SELECT 1;"
   ```

### 数据库连接失败

1. 检查防火墙：端口5432是否开放
2. 检查PostgreSQL配置：
   ```bash
   # 检查监听地址
   sudo grep "listen_addresses" /www/server/postgresql/data/postgresql.conf

   # 检查pg_hba.conf
   sudo cat /www/server/postgresql/data/pg_hba.conf | grep moreyudeals
   ```
3. 重启PostgreSQL：
   ```bash
   sudo systemctl restart postgresql
   ```

### 服务频繁重启

1. 查看错误日志：`pm2 logs --err --lines 100`
2. 检查内存使用：`pm2 monit`
3. 检查磁盘空间：`df -h`

---

## 监控和维护

### 日志管理

PM2日志文件位置：
- API标准输出：`~/.pm2/logs/moreyudeals-api-out.log`
- API错误输出：`~/.pm2/logs/moreyudeals-api-error.log`
- Worker标准输出：`~/.pm2/logs/moreyudeals-worker-out.log`
- Worker错误输出：`~/.pm2/logs/moreyudeals-worker-error.log`

定期清理日志：
```bash
pm2 flush  # 清空所有日志
```

### 性能监控

```bash
# 实时监控
pm2 monit

# 查看资源使用
pm2 status
```

---

## 安全建议

1. **定期更新密码**：定期更改数据库密码和API密钥
2. **限制IP访问**：在`pg_hba.conf`中只允许特定IP访问
3. **使用环境变量**：敏感信息不要提交到Git
4. **定期备份**：每天自动备份数据库
5. **监控日志**：定期检查错误日志
6. **API密钥轮换**：定期更换API密钥

---

## 翻译系统故障排查

### 翻译失败问题

**症状**: 新抓取的deals没有标题(title为空)，无法在前端显示

**原因**: 翻译服务失败，`translation_status = 'failed'`

**排查步骤**:

#### 1. 查看翻译状态分布

```bash
# 连接数据库查看翻译状态
PGPASSWORD=your_password psql -h 43.157.40.96 -p 5432 -U moreyudeals -d moreyudeals -c "SELECT translation_status, COUNT(*) as count FROM deals GROUP BY translation_status ORDER BY count DESC;"
```

#### 2. 查看失败记录

```bash
# 查看最近的失败记录
PGPASSWORD=your_password psql -h 43.157.40.96 -p 5432 -U moreyudeals -d moreyudeals -c "SELECT id, title_de, created_at FROM deals WHERE translation_status = 'failed' ORDER BY created_at DESC LIMIT 10;"
```

#### 3. 检查 Worker 日志

```bash
# 查看翻译错误日志
pm2 logs moreyudeals-worker --err --lines 50
```

常见错误:
- **DeepL 429 错误**: 配额用完 → 修改 `TRANSLATION_PROVIDERS` 优先使用 Microsoft
- **Microsoft 401 错误**: API Key 无效 → 检查 `.env` 中的 Key 和 Region
- **Microsoft 403 错误**: API Key 过期或无权限 → 更换 Key

### 重置失败记录以重新翻译

当你修复了翻译配置后（例如更换了 provider 优先级），需要将失败的记录重置为 `pending` 状态:

```bash
# 将所有失败的记录改为 pending
PGPASSWORD=your_password psql -h 43.157.40.96 -p 5432 -U moreyudeals -d moreyudeals -c "UPDATE deals SET translation_status = 'pending' WHERE translation_status = 'failed';"

# 查看受影响的行数
# 输出: UPDATE 10 (表示更新了10条记录)

# 验证修改
PGPASSWORD=your_password psql -h 43.157.40.96 -p 5432 -U moreyudeals -d moreyudeals -c "SELECT translation_status, COUNT(*) FROM deals GROUP BY translation_status;"
```

重置后，翻译 Worker 会在下一个周期（默认5分钟）自动处理这些 `pending` 记录。

#### 实时监控翻译进度

```bash
# 实时查看 Worker 日志
pm2 logs moreyudeals-worker -f

# 应该看到类似输出:
# 🔧 翻译 Provider 优先级: microsoft > microsoft2 > deepl
# 📝 发现 10 个待翻译的优惠
# 🔄 使用 microsoft 翻译: Gratis Versand bei...
# ✅ 翻译完成 (1234ms): microsoft
```

### 修改翻译提供商优先级

编辑 `/var/www/Moreyudeals/packages/worker/.env`:

```bash
# 修改这一行（推荐配置）
TRANSLATION_PROVIDERS=microsoft,microsoft2,deepl

# 或者只用 Microsoft（完全禁用 DeepL）
TRANSLATION_PROVIDERS=microsoft,microsoft2
```

修改后重启 Worker:

```bash
cd /var/www/Moreyudeals
pm2 restart moreyudeals-worker
pm2 logs moreyudeals-worker -f
```

启动日志中会显示:
```
🔧 翻译 Provider 优先级: microsoft > microsoft2 > deepl
```

---

## 下一步

- [ ] 配置自动备份脚本
- [ ] 设置监控告警（如：Sentry）
- [ ] 配置HTTPS证书（如果需要）
- [ ] 部署Web前端到Vercel
- [ ] 配置CI/CD自动部署
