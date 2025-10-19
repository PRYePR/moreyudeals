# 生产环境部署前检查清单

**版本**: API-Only 商家提取优化版
**目标**: 将优化后的 Worker 部署到生产服务器
**日期**: 2025-10-19

---

## ✅ 部署前准备（已完成）

### 1. 代码开发和测试
- [x] 实现 API-Only 商家提取逻辑
- [x] 移除完整HTML抓取（fetchFullPageHtml）
- [x] 实现 `extractMerchantFromEmbedded()` 方法
- [x] 创建 `merchant-logos.ts` 配置文件
- [x] 单元测试通过
- [x] 本地集成测试完成（T10）

### 2. 文档准备
- [x] API-Only 部署文档：`docs/deployment/api-only-merchant-extraction.md`
- [x] 自动部署脚本：`deploy-worker-update.sh`
- [x] 预部署检查清单：`docs/deployment/PRE-DEPLOYMENT-CHECKLIST.md`
- [x] T10 集成验证报告：`/tmp/T10-Integration-Verification-Report.md`

### 3. 性能验证
- [x] 商家覆盖率：100% (40/40 deals)
- [x] Logo 覆盖率：100%
- [x] Token 自动添加：100% (33/33 forward links)
- [x] HTTP 请求减少：50% (2x/deal → 1x/deal)
- [x] 处理速度提升：18-36× (2-4s/deal → 110ms/deal)
- [x] 错误率：0%

---

## 🔍 部署前核对（待执行）

### Step 1: 服务器环境检查

#### 1.1 SSH 连接测试
```bash
# 登录生产服务器
ssh user@your-server-ip

# 确认当前用户权限
whoami
groups
```

**必需权限**:
- sudo 权限（用于 PM2 管理）
- Git 访问权限
- 数据库连接权限

#### 1.2 确认 Worker 目录位置
```bash
# 查找现有 Worker 安装位置
sudo find /var -name "Moreyudeals" -type d 2>/dev/null
sudo find /home -name "Moreyudeals" -type d 2>/dev/null
sudo find /opt -name "Moreyudeals" -type d 2>/dev/null

# 常见位置：
# /var/www/Moreyudeals
# /home/deploy/Moreyudeals
# /opt/Moreyudeals
```

**操作**: 记录实际路径，更新 `deploy-worker-update.sh` 第 19 行 `WORKER_DIR` 变量。

#### 1.3 检查 PM2 进程状态
```bash
# 列出所有 PM2 进程
pm2 list

# 查看 Worker 进程详情
pm2 show moreyudeals-worker

# 查看日志
pm2 logs moreyudeals-worker --lines 50
```

**操作**: 确认现有进程名称，更新 `deploy-worker-update.sh` 第 20 行 `PM2_APP_NAME` 变量（如果不同）。

#### 1.4 确认 Git 分支和远程仓库
```bash
cd /path/to/Moreyudeals
git remote -v
git branch -a
git status
```

**预期**:
- `origin` 指向正确的 Git 仓库
- `latest-2025` 分支存在
- 工作目录干净（无未提交修改）

#### 1.5 验证数据库连接
```bash
PGPASSWORD=bTXsPFtiLb7tNH87 psql \
  -h 43.157.22.182 \
  -p 5432 \
  -U moreyu_admin \
  -d moreyudeals \
  -c "SELECT COUNT(*) FROM deals;"
```

**预期**: 连接成功并返回当前优惠记录数。

#### 1.6 检查 Node.js 和 npm 版本
```bash
node --version
npm --version
pm2 --version
```

**要求**:
- Node.js: >= 18.0.0
- npm: >= 8.0.0
- PM2: >= 5.0.0

---

### Step 2: 数据库备份（重要！）

#### 2.1 创建完整备份
```bash
# 在服务器上执行
PGPASSWORD=bTXsPFtiLb7tNH87 pg_dump \
  -h 43.157.22.182 \
  -p 5432 \
  -U moreyu_admin \
  -d moreyudeals \
  --format=c \
  -f /tmp/moreyudeals_backup_$(date +%Y%m%d_%H%M%S).dump

# 验证备份文件
ls -lh /tmp/moreyudeals_backup_*.dump
```

**操作**: 记录备份文件路径，以备回滚使用。

#### 2.2 记录当前数据统计
```bash
PGPASSWORD=bTXsPFtiLb7tNH87 psql \
  -h 43.157.22.182 \
  -p 5432 \
  -U moreyu_admin \
  -d moreyudeals \
  -c "
SELECT
    COUNT(*) as total_deals,
    COUNT(CASE WHEN merchant IS NOT NULL THEN 1 END) as with_merchant,
    COUNT(CASE WHEN merchant = 'sparhamster' THEN 1 END) as sparhamster_merchant,
    COUNT(CASE WHEN merchant_link LIKE '%geizhals%' THEN 1 END) as geizhals_links,
    COUNT(CASE WHEN merchant_link LIKE '%forward.sparhamster.at%' THEN 1 END) as forward_links
FROM deals;
"
```

**目的**: 对比部署前后的数据变化。

---

### Step 3: 部署脚本准备

#### 3.1 上传部署脚本
```bash
# 从本地上传到服务器
scp /Users/prye/Documents/Moreyudeals/deploy-worker-update.sh \
    user@your-server-ip:/tmp/deploy-worker-update.sh
```

#### 3.2 修改脚本配置
```bash
# 在服务器上编辑
nano /tmp/deploy-worker-update.sh

# 确认/修改以下变量：
# - WORKER_DIR="/var/www/Moreyudeals"  # 改为实际路径
# - PM2_APP_NAME="moreyudeals-worker"  # 改为实际进程名
# - GIT_BRANCH="latest-2025"           # 确认分支名
```

#### 3.3 赋予执行权限
```bash
chmod +x /tmp/deploy-worker-update.sh
```

---

### Step 4: 检查数据库迁移

#### 4.1 确认迁移文件是否已应用
```bash
# 检查 price_update_note 和 previous_price 字段是否存在
PGPASSWORD=bTXsPFtiLb7tNH87 psql \
  -h 43.157.22.182 \
  -p 5432 \
  -U moreyu_admin \
  -d moreyudeals \
  -c "\d deals"
```

**查找字段**:
- `price_update_note` (TEXT)
- `previous_price` (NUMERIC)

**如果不存在**:
```bash
# 上传迁移文件
scp /Users/prye/Documents/Moreyudeals/packages/worker/migrations/005_add_price_update_fields.sql \
    user@your-server-ip:/tmp/005_add_price_update_fields.sql

# 执行迁移
PGPASSWORD=bTXsPFtiLb7tNH87 psql \
  -h 43.157.22.182 \
  -p 5432 \
  -U moreyu_admin \
  -d moreyudeals \
  -f /tmp/005_add_price_update_fields.sql
```

---

## 🚀 部署执行

### Step 5: 执行部署脚本

#### 5.1 运行部署
```bash
# 在服务器上执行
cd /tmp
./deploy-worker-update.sh
```

**脚本执行步骤**:
1. ✓ 检查 Worker 目录
2. ✓ 备份当前代码到 `/tmp/moreyudeals-backup-YYYYMMDD_HHMMSS`
3. ✓ 停止 PM2 进程
4. ✓ 拉取最新代码（latest-2025 分支）
5. ✓ 安装/更新依赖（npm install）
6. ✓ 编译 TypeScript（npm run build）
7. ✓ 检查数据库迁移
8. ✓ 启动 PM2 进程

**预计时间**: 3-5 分钟

#### 5.2 监控部署过程
```bash
# 另开一个 SSH 终端，实时监控日志
pm2 logs moreyudeals-worker --lines 100
```

---

## ✅ 部署后验证

### Step 6: 立即验证

#### 6.1 检查 PM2 状态
```bash
pm2 list
pm2 show moreyudeals-worker
```

**预期**:
- Status: `online`
- Uptime: 少于 5 分钟
- Restarts: 0

#### 6.2 查看日志输出
```bash
pm2 logs moreyudeals-worker --lines 50
```

**预期日志关键词**:
- `🔍 开始抓取 Sparhamster 优惠...`
- `Merchant extracted from _embedded: Amazon` (或其他商家)
- `✅ 新增优惠` 或 `🔁 检测到重复优惠`
- **不应该看到**: `错误: 403`, `Fallback: HTML scraping`, `merchant: sparhamster`

#### 6.3 手动触发一次抓取（测试）
```bash
cd /var/www/Moreyudeals/packages/worker
TRANSLATION_ENABLED=false npx tsx src/index.ts
```

**观察输出**:
- 商家提取是否成功
- 是否有错误日志
- 处理速度（应该很快，无延迟）

---

### Step 7: 数据库验证

#### 7.1 检查最新记录
```bash
PGPASSWORD=bTXsPFtiLb7tNH87 psql \
  -h 43.157.22.182 \
  -p 5432 \
  -U moreyu_admin \
  -d moreyudeals \
  -c "
SELECT
    LEFT(title, 50) as title,
    merchant,
    LEFT(merchant_link, 80) as link,
    created_at
FROM deals
ORDER BY created_at DESC
LIMIT 10;
"
```

**验证点**:
- ✅ `merchant` 应该是真实商家名称（Amazon, MediaMarkt 等），**不是** sparhamster
- ✅ `merchant_link` 应该是 `forward.sparhamster.at` 链接，**不是** geizhals
- ✅ `created_at` 时间戳应该是最近（部署后）

#### 7.2 验证商家覆盖率
```bash
PGPASSWORD=bTXsPFtiLb7tNH87 psql \
  -h 43.157.22.182 \
  -p 5432 \
  -U moreyu_admin \
  -d moreyudeals \
  -c "
SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN merchant IS NOT NULL THEN 1 END) as with_merchant,
    ROUND(100.0 * COUNT(CASE WHEN merchant IS NOT NULL THEN 1 END) / COUNT(*), 1) as coverage
FROM deals
WHERE created_at > NOW() - INTERVAL '1 hour';
"
```

**预期**: `coverage >= 95%` (理想情况 100%)

#### 7.3 验证链接类型分布
```bash
PGPASSWORD=bTXsPFtiLb7tNH87 psql \
  -h 43.157.22.182 \
  -p 5432 \
  -U moreyu_admin \
  -d moreyudeals \
  -c "
SELECT
    CASE
        WHEN merchant_link LIKE '%forward.sparhamster.at%' THEN 'forward'
        WHEN merchant_link LIKE '%geizhals%' THEN 'geizhals'
        WHEN merchant_link IS NULL OR merchant_link = '' THEN 'none'
        ELSE 'other'
    END as link_type,
    COUNT(*) as count
FROM deals
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY link_type;
"
```

**预期**:
- `forward`: 大部分记录（80-90%）
- `geizhals`: **0** (应该没有)
- `none`: 少量记录（10-20%，无购买链接的信息帖）

#### 7.4 抽查商家名称
```bash
PGPASSWORD=bTXsPFtiLb7tNH87 psql \
  -h 43.157.22.182 \
  -p 5432 \
  -U moreyu_admin \
  -d moreyudeals \
  -c "
SELECT
    merchant,
    COUNT(*) as count
FROM deals
WHERE created_at > NOW() - INTERVAL '1 hour'
AND merchant IS NOT NULL
GROUP BY merchant
ORDER BY count DESC;
"
```

**预期**: 看到多样化的商家名称（Amazon, MediaMarkt, tink, we-are.travel, OTTO 等）

---

### Step 8: 持续监控（部署后 1 小时内）

#### 8.1 监控 Worker 运行状态
```bash
# 每 10 分钟检查一次
watch -n 600 'pm2 list'
```

#### 8.2 监控错误日志
```bash
# 实时查看错误日志
pm2 logs moreyudeals-worker --err
```

**关注**:
- 数据库连接错误
- API 请求失败
- 商家提取异常

#### 8.3 监控商家覆盖率趋势
```bash
# 每 30 分钟运行一次
PGPASSWORD=bTXsPFtiLb7tNH87 psql \
  -h 43.157.22.182 \
  -p 5432 \
  -U moreyu_admin \
  -d moreyudeals \
  -c "
SELECT
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as total,
    COUNT(CASE WHEN merchant IS NOT NULL THEN 1 END) as with_merchant,
    ROUND(100.0 * COUNT(CASE WHEN merchant IS NOT NULL THEN 1 END) / COUNT(*), 1) as coverage
FROM deals
WHERE created_at > NOW() - INTERVAL '6 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
"
```

**预期**: 每小时覆盖率应该保持在 95% 以上。

---

## 🔄 回滚方案（如果出现问题）

### 紧急回滚步骤

#### 1. 停止当前 Worker
```bash
pm2 stop moreyudeals-worker
pm2 delete moreyudeals-worker
```

#### 2. 恢复代码
```bash
# 查找备份目录
ls -lt /tmp/moreyudeals-backup-* | head -1

# 恢复备份
cd /var/www
rm -rf Moreyudeals
cp -r /tmp/moreyudeals-backup-YYYYMMDD_HHMMSS Moreyudeals
cd Moreyudeals/packages/worker
```

#### 3. 重启旧版 Worker
```bash
pm2 start ecosystem.config.js
pm2 save
```

#### 4. 验证回滚
```bash
pm2 logs moreyudeals-worker --lines 50
```

---

## 📊 成功标准

### 部署成功的判断标准

| 指标 | 目标值 | 当前值 | 状态 |
|------|--------|--------|------|
| Worker 状态 | online | _待检查_ | ⏳ |
| 商家覆盖率 | >= 95% | _待检查_ | ⏳ |
| Logo 覆盖率 | >= 95% | _待检查_ | ⏳ |
| geizhals 链接数 | 0 | _待检查_ | ⏳ |
| forward 链接占比 | >= 80% | _待检查_ | ⏳ |
| HTTP 错误率 | 0% | _待检查_ | ⏳ |
| PM2 重启次数 | 0 | _待检查_ | ⏳ |

### 如果所有指标达标

✅ **部署成功！** 进入正常监控阶段。

### 如果任一指标未达标

⚠️ **需要调查**:
1. 查看详细日志
2. 检查数据库查询结果
3. 分析失败原因
4. 决定是否回滚或修复

---

## 📝 部署日志记录

### 部署信息

| 项目 | 值 |
|------|-----|
| 部署日期 | _YYYY-MM-DD HH:mm:ss_ |
| 执行人员 | _待填写_ |
| 服务器地址 | _待填写_ |
| Worker 目录 | _待填写_ |
| Git Commit | _待填写_ |
| 备份位置 | _待填写_ |

### 验证结果

```
# 粘贴部署后验证查询的结果

Step 7.1 - 最新记录:
[粘贴输出]

Step 7.2 - 商家覆盖率:
[粘贴输出]

Step 7.3 - 链接类型分布:
[粘贴输出]

Step 7.4 - 商家名称:
[粘贴输出]
```

### 问题记录

- [ ] 部署过程中是否出现错误？
  - 错误描述: _____________________
  - 解决方案: _____________________

- [ ] 验证是否通过？
  - 未通过的指标: _____________________
  - 后续操作: _____________________

---

## 🔗 相关文档

- [API-Only 商家提取部署文档](./api-only-merchant-extraction.md)
- [部署脚本](../../deploy-worker-update.sh)
- [T10 集成验证报告](/tmp/T10-Integration-Verification-Report.md)
- [数据库迁移脚本](../../packages/worker/migrations/005_add_price_update_fields.sql)

---

## 📞 技术支持

如遇问题，请联系开发团队并提供：
1. PM2 日志：`pm2 logs moreyudeals-worker --lines 200`
2. 数据库验证结果（Step 7 的所有查询输出）
3. 系统环境信息：`node --version`, `npm --version`, `pm2 --version`
4. 备份位置和时间戳
