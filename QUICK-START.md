# Moreyudeals 快速部署指南

**新服务器**: 43.157.40.96
**更新时间**: 2025-10-19

---

## 🚀 部署步骤总览

```
1. 初始化数据库 (本地运行脚本)
   ↓
2. 部署 Worker 到服务器
   ↓
3. 部署 Web 到 Vercel
   ↓
4. 验证功能
```

---

## 📋 第一步: 初始化数据库

在**本地**运行（已经在新服务器 43.157.40.96 创建数据库）:

```bash
cd /Users/prye/Documents/Moreyudeals
./scripts/init-database.sh
```

**预期输出**:
```
✓ 数据库连接成功
✓ 数据库创建成功
✓ 001_initial_schema.sql 完成
✓ 002_add_indexes.sql 完成
✓ 003_add_price_fields.sql 完成
✓ 004_add_merchant_fields.sql 完成
✓ 005_add_price_update_fields.sql 完成
✓ 006_add_fallback_link.sql 完成
✓ 表结构验证通过
✓ 索引创建完成
```

---

## 📋 第二步: 部署 Worker 到服务器

### 方式 A: 使用自动部署脚本（推荐）

1. **SSH 登录服务器**:
   ```bash
   ssh root@43.157.40.96
   # 或
   ssh your_username@43.157.40.96
   ```

2. **克隆代码**（首次部署）:
   ```bash
   cd /var/www
   git clone https://github.com/PRYePR/moreyudeals.git Moreyudeals
   cd Moreyudeals
   git checkout latest-2025
   ```

3. **运行部署脚本**:
   ```bash
   cd /var/www/Moreyudeals
   chmod +x deploy-worker-update.sh
   ./deploy-worker-update.sh
   ```

### 方式 B: 手动部署（详细步骤）

参考: [SERVER-DEPLOYMENT.md](./SERVER-DEPLOYMENT.md)

**验证 Worker 运行**:
```bash
pm2 list
pm2 logs moreyudeals-worker
```

预期看到:
- Status: `online`
- 日志显示: `🔍 开始抓取 Sparhamster 优惠...`

---

## 📋 第三步: 部署 Web 到 Vercel

### 1. 登录 Vercel
访问: https://vercel.com/dashboard

### 2. 导入项目
- 点击 "Add New..." → "Project"
- 选择 `PRYePR/moreyudeals` 仓库
- 点击 "Import"

### 3. 配置项目

**Root Directory**:
```
packages/web
```

**Environment Variables** (复制粘贴):
```env
DB_HOST=43.157.40.96
DB_PORT=5432
DB_NAME=moreyudeals
DB_USER=moreyu_admin
DB_PASSWORD=bTXsPFtiLb7tNH87
DB_SSL=false
DEALS_DATASET_LIMIT=120
DATABASE_URL=postgresql://moreyu_admin:bTXsPFtiLb7tNH87@43.157.40.96:5432/moreyudeals
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
NODE_ENV=production
DEEPL_API_KEY=1f7dff02-4dff-405f-94db-0d1ee398130f:fx
DEEPL_ENDPOINT=https://api-free.deepl.com/v2
```

**注意**: `NEXT_PUBLIC_APP_URL` 部署后需要更新为实际 URL

### 4. 部署
点击 "Deploy" 按钮，等待 2-3 分钟

### 5. 更新 URL
部署成功后:
1. 复制 Production URL (例如: `https://moreyudeals-xxx.vercel.app`)
2. Settings → Environment Variables
3. 编辑 `NEXT_PUBLIC_APP_URL` 为实际 URL
4. Redeploy

详细指南: [VERCEL-DEPLOYMENT.md](./VERCEL-DEPLOYMENT.md)

---

## ✅ 第四步: 验证部署

### 1. 验证 Worker

**在服务器上**:
```bash
# 检查状态
pm2 status

# 查看日志
pm2 logs moreyudeals-worker --lines 50

# 检查数据库
PGPASSWORD=bTXsPFtiLb7tNH87 psql \
  -h 43.157.40.96 \
  -p 5432 \
  -U moreyu_admin \
  -d moreyudeals \
  -c "SELECT COUNT(*) as total,
      COUNT(CASE WHEN merchant IS NOT NULL THEN 1 END) as with_merchant
      FROM deals;"
```

**预期**:
- Worker 状态: `online`
- 数据库有数据记录
- 商家覆盖率 >= 95%

### 2. 验证 Web

**访问 Vercel URL**:
```bash
# 测试首页
curl https://your-project.vercel.app

# 测试 API
curl https://your-project.vercel.app/api/deals

# 测试搜索
curl "https://your-project.vercel.app/api/deals?search=Amazon"
```

**预期**:
- ✅ 首页正常加载
- ✅ API 返回优惠数据
- ✅ 商家名称和 Logo 正确
- ✅ 跳转链接正常工作

---

## 📊 部署检查清单

### 数据库 (43.157.40.96)
- [ ] 数据库初始化完成 (运行 init-database.sh)
- [ ] 所有迁移脚本执行成功
- [ ] 表结构验证通过
- [ ] 索引创建完成

### Worker 服务器
- [ ] Node.js >= 18 已安装
- [ ] PM2 已安装
- [ ] 代码已克隆到 /var/www/Moreyudeals
- [ ] 依赖安装完成 (npm install)
- [ ] 构建完成 (npm run build)
- [ ] PM2 服务运行中 (status: online)
- [ ] 日志无错误
- [ ] 数据库有数据

### Vercel Web
- [ ] 项目成功导入
- [ ] Root Directory 设置为 packages/web
- [ ] 所有环境变量已配置
- [ ] 部署成功 (status: Ready)
- [ ] 网站可访问
- [ ] API 返回正确数据
- [ ] NEXT_PUBLIC_APP_URL 已更新

---

## 🔧 常见问题

### Worker 无法连接数据库
```bash
# 检查防火墙
sudo ufw allow 5432/tcp

# 测试连接
PGPASSWORD=bTXsPFtiLb7tNH87 psql -h 43.157.40.96 -p 5432 -U moreyu_admin -d moreyudeals -c "SELECT 1;"
```

### Vercel 构建失败
- 检查 Root Directory 是否设置为 `packages/web`
- 检查环境变量是否完整
- 查看 Build Logs

### 数据库迁移失败
```bash
# 手动执行迁移
cd packages/worker/migrations
for f in *.sql; do
  PGPASSWORD=bTXsPFtiLb7tNH87 psql \
    -h 43.157.40.96 \
    -p 5432 \
    -U moreyu_admin \
    -d moreyudeals \
    -f "$f"
done
```

---

## 📚 详细文档

- **服务器部署**: [SERVER-DEPLOYMENT.md](./SERVER-DEPLOYMENT.md)
- **Vercel 部署**: [VERCEL-DEPLOYMENT.md](./VERCEL-DEPLOYMENT.md)
- **完整指南**: [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)

---

## 🎉 部署完成后

### 监控
```bash
# Worker 日志
pm2 logs moreyudeals-worker

# 数据库统计
PGPASSWORD=bTXsPFtiLb7tNH87 psql -h 43.157.40.96 -p 5432 -U moreyu_admin -d moreyudeals -c "
SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN merchant IS NOT NULL THEN 1 END) as with_merchant,
    ROUND(100.0 * COUNT(CASE WHEN merchant IS NOT NULL THEN 1 END) / COUNT(*), 1) as percentage
FROM deals;
"
```

### 自动更新
每次代码更新后:
```bash
# 本地提交
git push origin latest-2025

# Web 会自动部署 (Vercel)
# Worker 需要手动更新 (在服务器上运行)
cd /var/www/Moreyudeals
./deploy-worker-update.sh
```

---

**祝贺**: 部署完成！ 🎉

**访问**: https://your-vercel-url.vercel.app
