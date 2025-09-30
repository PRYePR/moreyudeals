# 部署手册 (DEPLOYMENT)

> 环境：腾讯云轻量服务器（Linux）+ 宝塔面板  
> 目标：部署 Strapi（自托管）、抓取脚本（定时），前端托管 Vercel；媒体存 COS；HTTPS 全站。

---

## 1. 前置清单
- 已准备域名：`deals.moreyu.com`
- 邮箱：`support@moreyu.com`, `legal@moreyu.com`（SPF/DKIM/DMARC 已配置）
- 腾讯云 COS：已创建 Bucket，拿到 `Bucket`、`Region`、`SecretId`、`SecretKey`
- 服务器开放端口：80 / 443 / 22
- 宝塔已安装：**Node.js LTS、Nginx、PostgreSQL、PM2**

---

## 2. PostgreSQL 初始化
在宝塔或终端创建两个数据库与用户（示例）：
```sql
-- 登录 psql 后执行
CREATE DATABASE strapi_db;
CREATE USER strapi_app WITH ENCRYPTED PASSWORD '强密码';
GRANT ALL PRIVILEGES ON DATABASE strapi_db TO strapi_app;

CREATE DATABASE umami_db;
CREATE USER umami_app WITH ENCRYPTED PASSWORD '强密码2';
GRANT ALL PRIVILEGES ON DATABASE umami_db TO umami_app;
```

---

## 3. Strapi 部署（自托管）
### 3.1 目录与代码
```bash
mkdir -p /var/www/strapi && cd /var/www/strapi
npx create-strapi-app@latest . --quickstart
# 或 git clone 你们的 strapi 项目（推荐用 Git 管理）
```

### 3.2 安装 COS 上传 Provider（S3 兼容）
```bash
cd /var/www/strapi
npm i @strapi/provider-upload-aws-s3
```

### 3.3 生产环境 `.env` 示例
> 按需调整，**不要提交到仓库**。COS 走 S3 兼容端点。

```
# --- 基础 ---
HOST=0.0.0.0
PORT=1337
APP_KEYS=请用openssl rand -hex 32生成四个用逗号分隔
API_TOKEN_SALT=openssl rand -hex 16
ADMIN_JWT_SECRET=openssl rand -hex 32
JWT_SECRET=openssl rand -hex 32
NODE_ENV=production

# --- 数据库 ---
DATABASE_CLIENT=postgres
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=strapi_db
DATABASE_USERNAME=strapi_app
DATABASE_PASSWORD=强密码
DATABASE_SSL=false

# --- CORS（在 Strapi 配置中设置允许域名）---
# 在 ./config/middlewares.js 配置 CORS allow origin 为 https://deals.moreyu.com

# --- 上传 (COS via S3 兼容) ---
AWS_ACCESS_KEY_ID=你的SecretId
AWS_ACCESS_SECRET=你的SecretKey
AWS_REGION=ap-xxx
AWS_BUCKET=your-cos-bucket
AWS_S3_ENDPOINT=https://cos.ap-xxx.myqcloud.com
AWS_S3_FORCE_PATH_STYLE=true
AWS_BASE_URL= # 可留空，或使用 CDN 域名

# --- 安全 ---
ADMIN_PATH=/control   # 管理后台路径改名
```

### 3.4 Strapi 配置上传 Provider
在 `./config/plugins.js`（没有就新建）：
```js
module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        accessKeyId: env('AWS_ACCESS_KEY_ID'),
        secretAccessKey: env('AWS_ACCESS_SECRET'),
        region: env('AWS_REGION'),
        params: {
          Bucket: env('AWS_BUCKET'),
        },
        endpoint: env('AWS_S3_ENDPOINT'),
        s3ForcePathStyle: env.bool('AWS_S3_FORCE_PATH_STYLE', true),
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
      baseUrl: env('AWS_BASE_URL', null),
    },
  },
});
```

### 3.5 中间件（CORS）与安全
`./config/middlewares.js`：
```js
module.exports = [
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:', 'http:'],
          'img-src': ["'self'", 'data:', 'blob:', 'https:'],
          'media-src': ["'self'", 'data:', 'blob:', 'https:'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      origin: ['https://deals.moreyu.com', 'https://staging.moreyu.com'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      keepHeaderOnError: true,
    },
  },
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
```

### 3.6 PM2 启动 Strapi
```bash
cd /var/www/strapi
pm2 start "npm run start" --name strapi-app --time
pm2 save
pm2 startup
```

---

## 4. Nginx 反向代理与 HTTPS（宝塔面板）
### 4.1 新建站点 `deals.moreyu.com`（仅做反代 Strapi Admin 可选）
前端在 Vercel，无需本机提供页面；这里仅在 **需要访问 Strapi Admin** 的场景下做子域反代，例如 `cms.moreyu.com`。

以 `cms.moreyu.com` 为例，新建站点后在“配置文件”中填入：
```nginx
server {
    listen 80;
    server_name cms.moreyu.com;
    location / {
        proxy_pass http://127.0.0.1:1337;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
    }
}
```
在宝塔为该站点申请 **Let’s Encrypt** 证书，强制 HTTPS：
```nginx
server {
    listen 80;
    server_name cms.moreyu.com;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl http2;
    server_name cms.moreyu.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:1337;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
    }
}
```

> 如果你只在内网/VPN 访问 Strapi Admin，可不做公网反代，直接在安全组里限制访问。

---

## 5. 抓取脚本部署（PM2 定时）
### 5.1 目录与依赖
```bash
mkdir -p /var/www/deals-worker && cd /var/www/deals-worker
# 把代码拉下来
git clone <your-worker-repo> .
npm i
```

### 5.2 `.env`（示例）
```
# Strapi连接配置
STRAPI_API_BASE=https://cms.moreyu.com
STRAPI_API_TOKEN_WRITE=xxx     # 写权限 Token

# 翻译Provider配置（多Provider架构）
TRANSLATION_PRIMARY=deepl      # 主要Provider: deepl|microsoft|google
TRANSLATION_FALLBACK=microsoft # 备用Provider: microsoft|google|deepl

# DeepL配置（支持多Key轮换）
DEEPL_KEYS=dl_key1,dl_key2,dl_key3                    # 多个API Key，逗号分隔
DEEPL_ENDPOINT=https://api.deepl.com/v2/translate     # Pro版端点
DEEPL_MONTHLY_LIMIT=500000                            # 月度字符限额

# Microsoft Translator配置
MS_KEYS=ms_key1|westeurope,ms_key2|eastus            # Key|Region格式，逗号分隔
MS_ENDPOINT=https://api.cognitive.microsofttranslator.com/translate?api-version=3.0
MS_MONTHLY_LIMIT=2000000                             # 月度字符限额

# Google Translate配置（备用）
GOOGLE_API_KEY=google_key                            # Google Cloud Translation API
GOOGLE_MONTHLY_LIMIT=500000                          # 月度字符限额

# Redis缓存配置
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=                                      # 可选
CACHE_TTL=604800                                     # 缓存7天

# 翻译质量与成本控制
TRANSLATION_CACHE_ENABLED=true                       # 启用翻译缓存
HIGH_PRIORITY_PROVIDER=deepl                         # 高优先级内容使用的Provider
QUOTA_WARNING_THRESHOLD=0.8                          # 配额警告阈值（80%）
AUTO_FALLBACK_ENABLED=true                           # 自动故障转移

# 其他配置
USER_AGENT=MoreyuDealsBot/1.0
REQUEST_TIMEOUT_MS=10000
LOG_LEVEL=info
```

### 5.3 PM2 定时启动
```bash
pm2 start rss-worker.js --name deals-rss --cron "*/15 * * * *" --time
pm2 save
pm2 startup
```

### 5.4 Redis部署（翻译缓存）
```bash
# 宝塔面板安装Redis
# 或手动安装
sudo apt install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# 配置Redis（可选）
sudo nano /etc/redis/redis.conf
# 设置密码：requirepass your_password
# 设置最大内存：maxmemory 512mb
# 设置LRU策略：maxmemory-policy allkeys-lru

# 重启Redis
sudo systemctl restart redis-server
```

### 5.5 翻译服务依赖安装
```bash
# 进入项目目录
cd /var/www/deals-worker

# 安装翻译相关依赖
npm install redis ioredis
npm install node-fetch axios
npm install crypto-js  # 用于缓存键哈希

# 如果使用TypeScript
npm install @types/node @types/redis
```

### 5.6 日志与重试
- `pm2 logs deals-rss` 查看实时日志
- 翻译Provider故障时自动切换，记录切换日志
- 失败采用指数退避，3 次后落库 `jobs` 表并邮件告警到 `support@moreyu.com`
- Redis连接失败时降级为无缓存模式，不影响翻译功能

---

## 6. 前端（Vercel）
- 在 Vercel 连接前端仓库，配置环境变量：
  - `NEXT_PUBLIC_SITE_URL=https://deals.moreyu.com`
  - `STRAPI_API_BASE=https://cms.moreyu.com`（或你的 Strapi 公网地址）
  - 只读 Token 建议由 Next.js **服务端**使用，不暴露到浏览器
- ISR：提供 `/api/revalidate`，Strapi 发布/更新时调用该 Webhook：
  - Strapi → **Settings → Webhooks** 添加一个指向 `https://deals.moreyu.com/api/revalidate?secret=XXXX` 的 POST

---

## 7. Umami（可选）
- 使用 `umami_db` 数据库，独立部署，Nginx 反代 `analytics.moreyu.com`
- 嵌入前端站点时，启用匿名化与 EU 端点（若用官方云）

---

## 8. 备份与恢复
### 8.1 定时备份到 COS
```bash
0 3 * * * pg_dump -U postgres strapi_db | gzip > /data/backups/strapi_$(date +\%F).sql.gz && coscmd upload /data/backups/strapi_$(date +\%F).sql.gz cos://your-bucket/backups/
```
- 保留 30 天；每月演练一次恢复流程。

### 8.2 恢复示例
```bash
gunzip -c /data/backups/strapi_2025-09-28.sql.gz | psql -U postgres -d strapi_db
```

---

## 9. 安全与运维要点
- Admin 路径 `/control`，强密码策略，必要时 IP 白名单
- CORS 仅允许正式/预发域名
- 所有外链加 `rel="nofollow external sponsored"`
- 抓取脚本 UA 标识明确，遵守 robots 与频控
- 监控：PM2 健康、磁盘用量、数据库连接数
- 日志留存 30 天，定期清理

---

## 10. 故障排查速查表
- **Admin 打不开/很慢**：检查 Nginx 反代、SSL、PM2 进程与服务器负载
- **媒体 403/404**：检查 COS 权限、Bucket 跨域设置、Strapi provider 配置
- **抓取无数据**：看 `pm2 logs deals-rss`，排查网络、ETag/304 逻辑、去重 checksum
- **翻译失败**：检查当前Provider状态，查看是否自动切换到备用Provider；检查Redis缓存状态；查看配额使用情况
- **前端未更新**：检查 Strapi Webhook 是否触发 Vercel `/api/revalidate`，或等待 ISR 过期再生

---

> 完成以上步骤后，整套系统即可稳定运行：  
> - 前端：Vercel  
> - 后端 CMS：自托管 Strapi（COS 存储）  
> - 数据库：PostgreSQL（每日备份 + COS 异地）  
> - 抓取：PM2 cron 定时  
> - SEO/合规：摘要 index、全文 noindex、来源与法务声明清晰
