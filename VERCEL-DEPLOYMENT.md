# Moreyudeals Web 前端 - Vercel 部署指南

**目标平台**: Vercel
**数据库**: 43.157.40.96 (PostgreSQL)
**部署日期**: 2025-10-19

---

## 一、部署概览

### 架构说明
```
GitHub (latest-2025 分支)
    ↓ 自动部署
Vercel (Next.js App)
    ↓ 连接
PostgreSQL (43.157.40.96)
```

### 特性
- ✨ 自动部署: Git Push 触发自动构建
- 🌍 全球 CDN: 边缘节点加速
- 🔒 自动 HTTPS: 免费 SSL 证书
- 📊 性能监控: 内置分析工具

---

## 二、前置要求

### 1. Vercel 账号
如果还没有 Vercel 账号:
1. 访问 https://vercel.com
2. 点击 "Sign Up"
3. 使用 GitHub 账号登录 (推荐)
4. 授权 Vercel 访问你的 GitHub 仓库

### 2. GitHub 仓库
确保代码已推送到 GitHub:
- 仓库: https://github.com/PRYePR/moreyudeals.git
- 分支: latest-2025
- 状态: 最新提交已推送

---

## 三、Vercel 部署步骤

### Step 1: 导入项目

1. 登录 Vercel Dashboard: https://vercel.com/dashboard
2. 点击 "Add New..." → "Project"
3. 选择 "Import Git Repository"
4. 找到 `PRYePR/moreyudeals` 仓库，点击 "Import"

### Step 2: 配置项目

#### 2.1 Framework Preset
- **Framework Preset**: Next.js (自动检测)
- **Root Directory**: `packages/web` ⚠️ **重要**: 必须设置为 `packages/web`
- **Build Command**: `npm run build` (默认)
- **Output Directory**: `.next` (默认)
- **Install Command**: `npm install` (默认)

#### 2.2 Environment Variables (环境变量)

点击 "Environment Variables" 展开，添加以下变量:

```env
# 数据库配置
DB_HOST=43.157.40.96
DB_PORT=5432
DB_NAME=moreyudeals
DB_USER=moreyu_admin
DB_PASSWORD=bTXsPFtiLb7tNH87
DB_SSL=false
DEALS_DATASET_LIMIT=120

# 数据库连接字符串 (备用)
DATABASE_URL=postgresql://moreyu_admin:bTXsPFtiLb7tNH87@43.157.40.96:5432/moreyudeals

# Next.js 配置
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
NODE_ENV=production

# Redis (可选 - 如果服务器有 Redis)
# REDIS_URL=redis://43.157.40.96:6379

# DeepL 翻译 (可选)
DEEPL_API_KEY=1f7dff02-4dff-405f-94db-0d1ee398130f:fx
DEEPL_ENDPOINT=https://api-free.deepl.com/v2
```

**注意事项**:
- 所有环境变量适用于 **Production**, **Preview**, **Development** 三个环境 (全选)
- `NEXT_PUBLIC_APP_URL` 在首次部署后需要更新为实际的 Vercel URL

### Step 3: 部署

1. 确认所有配置正确
2. 点击 "Deploy" 按钮
3. 等待构建完成 (通常 2-3 分钟)

**构建过程**:
```
✓ Installing dependencies (npm install)
✓ Building application (npm run build)
✓ Generating static pages
✓ Collecting page data
✓ Finalizing page optimization
✓ Deploying to global CDN
```

### Step 4: 验证部署

部署成功后，你会看到:
- ✅ **Deployment Status**: Ready
- 🌐 **Production URL**: `https://your-project.vercel.app`
- 📊 **Build Time**: ~2-3 分钟

点击 "Visit" 访问你的网站。

---

## 四、配置自定义域名 (可选)

### 1. 添加域名

1. 进入项目 Settings → Domains
2. 输入你的域名，例如: `moreyudeals.com`
3. 点击 "Add"

### 2. 配置 DNS

Vercel 会提供 DNS 配置指引:

**选项 A: 使用 Vercel Nameservers (推荐)**
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**选项 B: 添加 A/CNAME 记录**
```
A     @      76.76.21.21
CNAME www    cname.vercel-dns.com
```

### 3. 等待 DNS 生效

通常需要 24-48 小时。可以使用以下命令检查:
```bash
dig moreyudeals.com
```

### 4. 更新环境变量

DNS 生效后，更新 `NEXT_PUBLIC_APP_URL`:
1. Settings → Environment Variables
2. 编辑 `NEXT_PUBLIC_APP_URL`
3. 改为: `https://moreyudeals.com`
4. 点击 "Save"
5. Deployments → 最新部署 → "..." → "Redeploy"

---

## 五、验证功能

### 1. 测试首页

访问: `https://your-project.vercel.app`

**检查**:
- [ ] 页面正常加载
- [ ] 显示优惠列表
- [ ] 图片和 Logo 正常显示
- [ ] 样式和布局正确

### 2. 测试 API

使用浏览器或 curl 测试:

```bash
# 测试 API
curl https://your-project.vercel.app/api/deals

# 测试搜索
curl "https://your-project.vercel.app/api/deals?search=Amazon"

# 测试单个优惠
curl "https://your-project.vercel.app/api/deals/1"
```

**预期响应**:
```json
{
  "deals": [
    {
      "id": 1,
      "title": "...",
      "merchant": "Amazon",
      "merchantLogo": "https://www.sparhamster.at/images/shops/...",
      "dealUrl": "/api/go/1",
      ...
    }
  ],
  "total": 40,
  "page": 1
}
```

### 3. 测试跳转链接

```bash
# 测试跳转
curl -I "https://your-project.vercel.app/api/go/1"
```

**预期**: `302 Found` + `Location: https://forward.sparhamster.at/...`

### 4. 测试数据库连接

在 Vercel Dashboard → Functions 查看日志:
1. Deployments → 最新部署 → "View Function Logs"
2. 触发一个 API 请求
3. 检查日志是否有数据库连接错误

**正常日志**:
```
GET /api/deals
Database query executed successfully
Returned 40 deals
```

---

## 六、自动部署配置

### 1. Git 集成

Vercel 已自动配置 Git 集成:
- **Production Branch**: `latest-2025` (或你指定的分支)
- **自动部署**: 每次 Push 到 `latest-2025` 触发部署

### 2. 部署触发

```bash
# 在本地提交并推送
git add .
git commit -m "Update feature"
git push origin latest-2025
```

Vercel 会自动:
1. 检测到 Push
2. 开始构建
3. 运行测试 (如果有)
4. 部署到 Production
5. 发送通知 (Email/Slack)

### 3. Preview 部署

任何 Pull Request 都会自动创建 Preview 部署:
- URL: `https://moreyudeals-git-branch-name.vercel.app`
- 独立环境
- 不影响 Production

---

## 七、性能优化

### 1. 启用边缘缓存

编辑 API 路由文件，添加缓存头:

`packages/web/src/app/api/deals/route.ts`:
```typescript
export const runtime = 'edge'; // 使用边缘运行时

export async function GET(request: Request) {
  const deals = await getDeals();

  return new Response(JSON.stringify(deals), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // 缓存 5 分钟
    },
  });
}
```

### 2. 配置图片优化

`packages/web/next.config.js`:
```javascript
module.exports = {
  images: {
    domains: ['www.sparhamster.at'],
    formats: ['image/avif', 'image/webp'],
  },
};
```

### 3. 启用压缩

Vercel 自动启用 Brotli/Gzip 压缩，无需配置。

---

## 八、监控和分析

### 1. Vercel Analytics

启用内置分析:
1. 项目 Settings → Analytics
2. 点击 "Enable Analytics"
3. 安装 SDK (可选):
   ```bash
   cd packages/web
   npm install @vercel/analytics
   ```
4. 添加到 `app/layout.tsx`:
   ```typescript
   import { Analytics } from '@vercel/analytics/react';

   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           {children}
           <Analytics />
         </body>
       </html>
     );
   }
   ```

### 2. Speed Insights

启用性能监控:
1. 项目 Settings → Speed Insights
2. 点击 "Enable Speed Insights"
3. 安装 SDK:
   ```bash
   npm install @vercel/speed-insights
   ```
4. 添加到 `app/layout.tsx`:
   ```typescript
   import { SpeedInsights } from '@vercel/speed-insights/next';

   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           {children}
           <SpeedInsights />
         </body>
       </html>
     );
   }
   ```

### 3. 日志查看

查看实时日志:
1. Deployments → 选择部署
2. "View Function Logs"
3. 或使用 Vercel CLI:
   ```bash
   npm install -g vercel
   vercel login
   vercel logs
   ```

---

## 九、故障排查

### 问题 1: 构建失败

**症状**: 部署状态显示 "Build Failed"

**排查步骤**:
1. 查看构建日志: Deployments → 失败的部署 → "View Build Logs"
2. 常见错误:
   - **Module not found**: 检查 `package.json` 是否包含所有依赖
   - **Build command failed**: 本地运行 `npm run build` 测试
   - **Root Directory 错误**: 确保设置为 `packages/web`

**解决方案**:
```bash
# 本地测试构建
cd packages/web
npm install
npm run build
```

### 问题 2: 数据库连接失败

**症状**: API 返回 500 错误，日志显示 "Connection refused"

**排查步骤**:
1. 检查环境变量: Settings → Environment Variables
2. 确认数据库 IP: `43.157.40.96`
3. 测试数据库连接:
   ```bash
   PGPASSWORD=bTXsPFtiLb7tNH87 psql -h 43.157.40.96 -p 5432 -U moreyu_admin -d moreyudeals -c "SELECT 1;"
   ```
4. 检查服务器防火墙:
   ```bash
   # 在服务器上
   sudo ufw allow from 0.0.0.0/0 to any port 5432
   ```

### 问题 3: 页面显示 404

**症状**: 访问网站显示 "404 - Page Not Found"

**原因**: Root Directory 配置错误

**解决方案**:
1. Settings → General → Root Directory
2. 改为: `packages/web`
3. 保存并重新部署

### 问题 4: 环境变量未生效

**症状**: 代码中读取的环境变量为 undefined

**解决方案**:
1. 检查变量名是否正确
2. 客户端变量必须以 `NEXT_PUBLIC_` 开头
3. 修改环境变量后需要重新部署:
   - Deployments → "..." → "Redeploy"

---

## 十、安全建议

### 1. 敏感信息保护

- ✅ **数据库密码**: 仅保存在 Vercel 环境变量，不要提交到 Git
- ✅ **API Keys**: 使用环境变量，不要硬编码
- ✅ **.env.local**: 已在 `.gitignore` 中，确保不上传

### 2. CORS 配置

如果需要限制 API 访问:

`packages/web/src/middleware.ts`:
```typescript
export function middleware(request: Request) {
  const origin = request.headers.get('origin');
  const allowedOrigins = ['https://moreyudeals.com', 'https://www.moreyudeals.com'];

  if (origin && !allowedOrigins.includes(origin)) {
    return new Response('Forbidden', { status: 403 });
  }

  return NextResponse.next();
}
```

### 3. 速率限制

安装限流中间件:
```bash
npm install @vercel/edge-rate-limit
```

---

## 十一、成本估算

### Vercel 免费套餐包含:
- ✅ 100 GB 带宽/月
- ✅ 无限部署
- ✅ 自动 HTTPS
- ✅ 全球 CDN
- ✅ 团队协作 (最多 3 人)

### 超出后收费:
- 带宽: $40/100GB
- Serverless 函数执行时间: $20/100GB-小时

### 数据库成本:
- 自有服务器: 已包含
- 无额外费用

**估算**: 月访问量 < 100 万次 → **完全免费**

---

## 十二、下一步

完成 Vercel 部署后:

1. [ ] 配置自定义域名 (可选)
2. [ ] 启用 Analytics 和 Speed Insights
3. [ ] 设置告警通知 (Vercel → Integrations → Slack)
4. [ ] 配置 CI/CD (GitHub Actions)
5. [ ] 性能优化 (缓存、图片优化)

---

## 十三、检查清单

- [ ] Vercel 账号已创建并连接 GitHub
- [ ] 项目成功导入到 Vercel
- [ ] Root Directory 设置为 `packages/web`
- [ ] 所有环境变量已配置
- [ ] 首次部署成功 (状态: Ready)
- [ ] 网站可访问 (https://your-project.vercel.app)
- [ ] API 返回正确数据 (/api/deals)
- [ ] 数据库连接正常
- [ ] 跳转链接正常 (/api/go/:id)
- [ ] 自动部署已配置 (Git Push 触发)
- [ ] 已启用 Analytics/Speed Insights (可选)
- [ ] 已配置自定义域名 (可选)

---

**祝贺**: Web 前端部署完成！

**访问**: https://your-project.vercel.app

**下一步**: 监控数据和性能，根据用户反馈优化。

**最后更新**: 2025-10-19
