# Moreyudeals 部署指南

**版本**: 新架构 (REST API + 首页HTML补链)
**日期**: 2025-10-19

---

## 一、架构概述

### 数据流程
```
REST API (结构化数据)
    ↓
首页 HTML (真实链接和logo)
    ↓
数据库 (PostgreSQL)
    ↓
Web API (Next.js)
    ↓
用户界面
```

### 关键特性
1. **双数据源**: REST API 提供结构化信息,首页 HTML 提供可信跳转链接
2. **Fallback 机制**: 未抓到真实链接时使用文章 URL
3. **智能匹配**: 通过 postId 和 slug 匹配 REST 数据与 HTML 数据
4. **限流优化**: 随机延迟、动态页数、重试机制

---

## 二、前置要求

### 系统要求
- **操作系统**: Linux/macOS/Windows
- **Node.js**: >= 18.0.0
- **PostgreSQL**: >= 14.0
- **Redis** (可选): >= 6.0 (用于缓存)
- **内存**: >= 2GB
- **磁盘**: >= 10GB

### 环境准备
```bash
# 1. 检查 Node.js 版本
node --version  # 应该 >= 18.0.0

# 2. 检查 PostgreSQL
psql --version

# 3. 安装依赖 (项目根目录)
yarn install
```

---

## 三、数据库配置

### 1. 连接信息
编辑环境变量文件 `.env`:
```env
# PostgreSQL 配置
DB_HOST=43.157.22.182
DB_PORT=5432
DB_NAME=moreyudeals
DB_USER=moreyu_admin
DB_PASSWORD=bTXsPFtiLb7tNH87
```

### 2. 执行迁移
```bash
cd packages/worker

# 执行所有迁移脚本
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations/001_initial_schema.sql
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations/002_add_indexes.sql
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations/003_add_price_fields.sql
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations/004_add_merchant_fields.sql
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations/005_add_price_update_fields.sql
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations/006_add_fallback_link.sql
```

### 3. 验证表结构
```bash
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\d deals"
```

应该看到 `fallback_link` 列存在。

---

## 四、Worker 服务部署

### 1. 配置环境变量
创建 `packages/worker/.env`:
```env
# 数据库配置
DB_HOST=43.157.22.182
DB_PORT=5432
DB_NAME=moreyudeals
DB_USER=moreyu_admin
DB_PASSWORD=bTXsPFtiLb7tNH87

# Sparhamster 配置
SPARHAMSTER_API_URL=https://www.sparhamster.at/wp-json/wp/v2/posts
SPARHAMSTER_API_LIMIT=40
SPARHAMSTER_BASE_URL=https://www.sparhamster.at
SPARHAMSTER_TOKEN=0ccb1264cd81ad8e20f27dd146dfa37d
SPARHAMSTER_USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36

# 抓取配置
FETCH_INTERVAL_MIN=1800  # 30分钟
FETCH_INTERVAL_MAX=2100  # 35分钟
RANDOM_DELAY_MIN=0       # 0分钟
RANDOM_DELAY_MAX=300     # 5分钟

# 翻译配置 (可选)
TRANSLATION_ENABLED=false  # 暂时禁用
DEEPL_API_KEY=your_deepl_api_key_here

# Redis (可选)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### 2. 构建和启动
```bash
cd packages/worker

# 构建
npm run build

# 测试运行
npm run dev

# 生产环境 (使用 PM2)
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. PM2 配置文件
创建 `packages/worker/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'moreyudeals-worker',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: 'logs/error.log',
    out_file: 'logs/output.log',
    time: true
  }]
}
```

### 4. 监控
```bash
# 查看日志
pm2 logs moreyudeals-worker

# 查看状态
pm2 status

# 重启服务
pm2 restart moreyudeals-worker
```

---

## 五、Web 服务部署

### 1. 配置环境变量
创建 `packages/web/.env.local`:
```env
# 数据库配置
DATABASE_URL=postgresql://moreyu_admin:bTXsPFtiLb7tNH87@43.157.22.182:5432/moreyudeals

# Next.js 配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=production

# Redis (可选)
REDIS_URL=redis://127.0.0.1:6379

# 分析和监控 (可选)
NEXT_PUBLIC_GA_ID=your_google_analytics_id
```

### 2. 构建和部署
```bash
cd packages/web

# 安装依赖
npm install

# 构建
npm run build

# 启动生产服务器
npm run start

# 或使用 PM2
pm2 start npm --name "moreyudeals-web" -- start
pm2 save
```

### 3. Nginx 反向代理 (推荐)
创建 `/etc/nginx/sites-available/moreyudeals`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源缓存
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable";
    }
}
```

启用配置:
```bash
sudo ln -s /etc/nginx/sites-available/moreyudeals /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. SSL 证书 (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
sudo systemctl reload nginx
```

---

## 六、验证部署

### 1. Worker 验证
```bash
# 检查进程
pm2 status

# 查看日志
tail -f packages/worker/logs/output.log

# 验证数据库
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT COUNT(*) as total,
       COUNT(CASE WHEN merchant_link IS NOT NULL THEN 1 END) as with_forward,
       COUNT(CASE WHEN fallback_link IS NOT NULL THEN 1 END) as with_fallback
FROM deals;
"
```

预期输出:
```
 total | with_forward | with_fallback
-------+--------------+---------------
    40 |           29 |            40
```

### 2. Web API 验证
```bash
# 测试首页
curl -I http://localhost:3000

# 测试 API
curl http://localhost:3000/api/deals | jq '.deals | length'

# 测试单个优惠
curl 'http://localhost:3000/api/deals?search=Canon' | jq '.deals[0].dealUrl'
```

预期:
- 首页返回 200
- API 返回 40 条优惠
- dealUrl 包含 forward 链接或 fallback 链接

### 3. 跳转测试
```bash
# 获取第一个优惠ID
DEAL_ID=$(curl -s http://localhost:3000/api/deals | jq -r '.deals[0].id')

# 测试跳转
curl -I "http://localhost:3000/api/go/$DEAL_ID"
```

应该返回 `302 Found` 并重定向到商家链接。

---

## 七、监控和维护

### 1. 日志监控
```bash
# Worker 日志
pm2 logs moreyudeals-worker --lines 100

# Web 日志
pm2 logs moreyudeals-web --lines 100

# 数据库日志
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### 2. 性能监控
```bash
# 数据库连接数
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT count(*) FROM pg_stat_activity;
"

# 表大小
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT pg_size_pretty(pg_total_relation_size('deals')) as size;
"

# Worker 内存使用
pm2 status
```

### 3. 定期任务
```bash
# 清理过期优惠 (每周)
0 0 * * 0 PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
DELETE FROM deals WHERE expires_at < NOW() - INTERVAL '30 days';
"

# 备份数据库 (每天)
0 2 * * * PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME > /backups/moreyudeals_$(date +\%Y\%m\%d).sql
```

---

## 八、故障排查

### 问题 1: Worker 抓取失败
**症状**: 日志中出现 "抓取首页失败"

**解决方案**:
1. 检查网络连接: `ping sparhamster.at`
2. 检查 User-Agent 是否被封: 更换 `SPARHAMSTER_USER_AGENT`
3. 增加重试次数和延迟
4. 临时禁用 HTML 抓取,仅使用 REST API

### 问题 2: 数据库连接超时
**症状**: "数据库连接失败"

**解决方案**:
1. 检查防火墙: `telnet $DB_HOST $DB_PORT`
2. 检查 PostgreSQL 配置: `postgresql.conf` 中 `listen_addresses`
3. 检查连接池设置: 增加 `max_connections`

### 问题 3: Web 服务内存占用高
**症状**: PM2 显示内存超过 500MB

**解决方案**:
1. 启用 Redis 缓存减少数据库查询
2. 减少 `SPARHAMSTER_FETCH_LIMIT` (当前 40)
3. 清理旧数据: 删除过期优惠

### 问题 4: 链接补充率低于 50%
**症状**: 数据库中 `merchant_link` 覆盖率低

**解决方案**:
1. 增加抓取页数 (当前最多 3 页)
2. 检查 HTML 解析逻辑是否失效
3. 查看 Worker 日志中的解析错误

---

## 九、性能优化建议

### 1. 数据库优化
```sql
-- 添加索引
CREATE INDEX IF NOT EXISTS idx_deals_merchant_link ON deals(merchant_link);
CREATE INDEX IF NOT EXISTS idx_deals_fallback_link ON deals(fallback_link);
CREATE INDEX IF NOT EXISTS idx_deals_published_at ON deals(published_at DESC);

-- 定期 VACUUM
VACUUM ANALYZE deals;
```

### 2. 缓存优化
- 启用 Redis 缓存
- 设置合理的 TTL (当前: 5分钟)
- 使用 CDN 缓存静态资源

### 3. Worker 优化
- 调整抓取间隔 (避开高峰期)
- 使用代理轮换避免封禁
- 并行处理多个数据源

---

## 十、安全建议

### 1. 数据库安全
- 使用强密码
- 限制远程访问 IP
- 定期更新 PostgreSQL
- 加密连接 (SSL/TLS)

### 2. API 安全
- 实施速率限制
- 使用 CORS 保护
- 隐藏敏感信息 (API keys)
- 日志脱敏

### 3. 服务器安全
- 定期更新系统
- 配置防火墙 (ufw/iptables)
- 使用 SSH 密钥登录
- 禁用 root 登录

---

## 十一、回滚计划

### 如果部署失败,按以下步骤回滚:

1. **停止新服务**
```bash
pm2 stop moreyudeals-worker
pm2 stop moreyudeals-web
```

2. **恢复数据库**
```bash
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < /backups/moreyudeals_backup.sql
```

3. **切换到旧代码**
```bash
git checkout <previous-commit>
npm install
npm run build
```

4. **重启服务**
```bash
pm2 restart all
```

---

## 十二、联系和支持

- **开发者**: Claude Code
- **文档**: `/Users/prye/Documents/Moreyudeals/T10-VERIFICATION-REPORT.md`
- **日志**: `packages/worker/logs/` 和 `packages/web/.next/`
- **问题追踪**: GitHub Issues

---

**部署检查清单**:
- [ ] 数据库迁移完成
- [ ] 环境变量配置正确
- [ ] Worker 服务启动成功
- [ ] Web 服务启动成功
- [ ] API 返回正确数据
- [ ] 链接跳转正常
- [ ] 监控和日志配置
- [ ] 备份计划设置
- [ ] 安全措施实施

---

**最后更新**: 2025-10-19
**版本**: 1.0.0
