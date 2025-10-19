# Moreyudeals 新服务器部署指南

**目标服务器**: 43.157.40.96
**部署日期**: 2025-10-19
**版本**: API-Only 商家提取优化版

---

## 一、部署概览

### 架构说明
```
┌─────────────────────────────────────────────┐
│          新服务器 (43.157.40.96)             │
├─────────────────────────────────────────────┤
│  PostgreSQL 数据库 (moreyudeals)             │
│  Worker 服务 (PM2)                           │
│  (可选) Redis 缓存                           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│          Vercel (Web 前端)                   │
│  Next.js 应用                                │
│  API Routes                                  │
└─────────────────────────────────────────────┘
```

### 服务组件
1. **数据库**: PostgreSQL 14+ (新服务器 43.157.40.96)
2. **Worker**: Node.js 后台服务，抓取并处理优惠数据
3. **Web**: Next.js 前端，部署到 Vercel

---

## 二、服务器环境准备

### 1. 系统要求
- 操作系统: Linux (Ubuntu 20.04+ 推荐)
- Node.js: >= 18.0.0
- PostgreSQL: >= 14.0
- PM2: >= 5.0.0
- Git: >= 2.0

### 2. SSH 登录服务器
```bash
# 使用你的 SSH 密钥或密码登录
ssh root@43.157.40.96
# 或
ssh your_username@43.157.40.96
```

### 3. 安装基础环境

#### 3.1 安装 Node.js 18
```bash
# 使用 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version  # 应该显示 v18.x.x
npm --version
```

#### 3.2 安装 PM2
```bash
# 全局安装 PM2
sudo npm install -g pm2

# 验证安装
pm2 --version

# 设置 PM2 开机自启
pm2 startup
# 按照提示执行输出的命令
```

#### 3.3 安装 Git
```bash
sudo apt-get update
sudo apt-get install -y git

# 配置 Git (如果需要)
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

#### 3.4 验证 PostgreSQL
```bash
# 检查数据库连接
psql -h 43.157.40.96 -p 5432 -U moreyu_admin -d postgres -c "SELECT version();"
```

---

## 三、部署步骤

### Step 1: 初始化数据库

从本地运行数据库初始化脚本:

```bash
# 在本地 Moreyudeals 项目根目录执行
cd /Users/prye/Documents/Moreyudeals
./scripts/init-database.sh
```

**脚本会自动完成**:
- ✓ 测试数据库连接
- ✓ 创建数据库 (如果不存在)
- ✓ 执行所有迁移脚本 (001-006)
- ✓ 创建索引
- ✓ 验证表结构

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

### Step 2: 克隆代码到服务器

在服务器上执行:

```bash
# 进入部署目录
cd /var/www  # 或其他你喜欢的目录

# 克隆仓库
sudo git clone https://github.com/PRYePR/moreyudeals.git Moreyudeals

# 设置权限
sudo chown -R $USER:$USER Moreyudeals
cd Moreyudeals

# 切换到最新分支
git checkout latest-2025
```

### Step 3: 安装依赖并构建 Worker

```bash
cd /var/www/Moreyudeals/packages/worker

# 安装依赖
npm install

# 构建 TypeScript
npm run build

# 验证构建
ls -la dist/
```

**预期**: `dist/` 目录下有编译好的 JavaScript 文件

### Step 4: 创建日志目录

```bash
cd /var/www/Moreyudeals/packages/worker
mkdir -p logs
```

### Step 5: 启动 Worker 服务

```bash
cd /var/www/Moreyudeals/packages/worker

# 使用 PM2 启动
pm2 start ecosystem.config.js

# 保存 PM2 配置
pm2 save

# 查看状态
pm2 list
pm2 logs moreyudeals-worker
```

**预期输出**:
```
┌─────┬────────────────────────┬─────────┬─────────┐
│ id  │ name                   │ status  │ restart │
├─────┼────────────────────────┼─────────┼─────────┤
│ 0   │ moreyudeals-worker     │ online  │ 0       │
└─────┴────────────────────────┴─────────┴─────────┘
```

---

## 四、验证部署

### 1. 检查 Worker 状态

```bash
# 查看进程状态
pm2 status

# 查看实时日志
pm2 logs moreyudeals-worker --lines 50
```

**应该看到**:
- ✓ Status: `online`
- ✓ Uptime: 正在运行
- ✓ Restarts: 0 或很少
- ✓ 日志显示: `🔍 开始抓取 Sparhamster 优惠...`

### 2. 手动触发一次抓取（测试）

```bash
cd /var/www/Moreyudeals/packages/worker

# 手动运行一次
TRANSLATION_ENABLED=false npx tsx src/index.ts
```

**观察输出**:
- ✓ 成功连接数据库
- ✓ 成功抓取 API 数据
- ✓ 商家提取成功 (非 "sparhamster")
- ✓ 商家链接提取成功 (forward.sparhamster.at)
- ✓ Logo 提取成功
- ✓ 数据保存成功

### 3. 验证数据库数据

```bash
# 查看最新记录
PGPASSWORD=bTXsPFtiLb7tNH87 psql \
  -h 43.157.40.96 \
  -p 5432 \
  -U moreyu_admin \
  -d moreyudeals \
  -c "SELECT LEFT(title, 50) as title, merchant, LEFT(merchant_link, 60) as link FROM deals ORDER BY created_at DESC LIMIT 5;"
```

**验证点**:
- ✅ `merchant` 应该是真实商家 (Amazon, MediaMarkt 等)
- ✅ `merchant_link` 应该是 forward 链接
- ✅ 有数据记录

### 4. 验证商家覆盖率

```bash
PGPASSWORD=bTXsPFtiLb7tNH87 psql \
  -h 43.157.40.96 \
  -p 5432 \
  -U moreyu_admin \
  -d moreyudeals \
  -c "
SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN merchant IS NOT NULL THEN 1 END) as with_merchant,
    ROUND(100.0 * COUNT(CASE WHEN merchant IS NOT NULL THEN 1 END) / COUNT(*), 1) as coverage
FROM deals;
"
```

**目标**: coverage >= 95%

---

## 五、常用管理命令

### PM2 管理

```bash
# 查看所有进程
pm2 list

# 查看日志
pm2 logs moreyudeals-worker
pm2 logs moreyudeals-worker --lines 100
pm2 logs moreyudeals-worker --err  # 仅错误日志

# 重启服务
pm2 restart moreyudeals-worker

# 停止服务
pm2 stop moreyudeals-worker

# 删除服务
pm2 delete moreyudeals-worker

# 查看详细信息
pm2 show moreyudeals-worker

# 监控
pm2 monit
```

### 更新代码

```bash
cd /var/www/Moreyudeals

# 拉取最新代码
git pull origin latest-2025

# 重新构建和重启
cd packages/worker
npm install
npm run build
pm2 restart moreyudeals-worker
```

或使用自动部署脚本:

```bash
cd /var/www/Moreyudeals
./deploy-worker-update.sh
```

### 数据库操作

```bash
# 连接数据库
PGPASSWORD=bTXsPFtiLb7tNH87 psql -h 43.157.40.96 -p 5432 -U moreyu_admin -d moreyudeals

# 查看表结构
\d deals

# 查看记录数
SELECT COUNT(*) FROM deals;

# 清空旧数据
DELETE FROM deals WHERE created_at < NOW() - INTERVAL '30 days';

# 退出
\q
```

---

## 六、故障排查

### 问题 1: Worker 无法启动

**症状**: `pm2 list` 显示 `errored` 或 `stopped`

**排查步骤**:
```bash
# 查看错误日志
pm2 logs moreyudeals-worker --err --lines 50

# 检查构建是否成功
ls -la /var/www/Moreyudeals/packages/worker/dist/

# 手动运行看详细错误
cd /var/www/Moreyudeals/packages/worker
node dist/index.js
```

**常见原因**:
- 数据库连接失败 → 检查 ecosystem.config.js 中的数据库配置
- 依赖缺失 → 运行 `npm install`
- 构建失败 → 运行 `npm run build`

### 问题 2: 数据库连接超时

**症状**: 日志显示 "ETIMEDOUT" 或 "Connection refused"

**解决方案**:
```bash
# 测试数据库连接
PGPASSWORD=bTXsPFtiLb7tNH87 psql -h 43.157.40.96 -p 5432 -U moreyu_admin -d moreyudeals -c "SELECT 1;"

# 检查防火墙
sudo ufw status
sudo ufw allow 5432/tcp  # 如果需要

# 检查 PostgreSQL 配置
# postgresql.conf: listen_addresses = '*'
# pg_hba.conf: 添加服务器 IP 白名单
```

### 问题 3: 商家提取失败

**症状**: 数据库中 merchant 字段为 NULL 或 "sparhamster"

**排查步骤**:
```bash
# 查看日志
pm2 logs moreyudeals-worker | grep "Merchant"

# 手动测试抓取
cd /var/www/Moreyudeals/packages/worker
TRANSLATION_ENABLED=false npx tsx src/index.ts

# 检查配置
cat ecosystem.config.js | grep SPARHAMSTER
```

### 问题 4: 内存占用过高

**症状**: PM2 显示内存超过 1GB

**解决方案**:
```bash
# 查看内存使用
pm2 status
free -h

# 调整内存限制
# 编辑 ecosystem.config.js
# max_memory_restart: '500M'  # 改小

# 重启服务
pm2 restart moreyudeals-worker
```

---

## 七、安全建议

### 1. 防火墙配置

```bash
# 安装 ufw (如果未安装)
sudo apt-get install ufw

# 允许 SSH
sudo ufw allow 22/tcp

# 允许 PostgreSQL (仅特定 IP)
sudo ufw allow from YOUR_IP to any port 5432

# 启用防火墙
sudo ufw enable
sudo ufw status
```

### 2. 定期备份

创建备份脚本 `/root/backup-db.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/backups/moreyudeals"
mkdir -p $BACKUP_DIR

PGPASSWORD=bTXsPFtiLb7tNH87 pg_dump \
  -h 43.157.40.96 \
  -p 5432 \
  -U moreyu_admin \
  moreyudeals \
  --format=c \
  -f "$BACKUP_DIR/moreyudeals_$(date +%Y%m%d_%H%M%S).dump"

# 保留最近 7 天的备份
find $BACKUP_DIR -name "*.dump" -mtime +7 -delete
```

设置定时任务:
```bash
chmod +x /root/backup-db.sh
crontab -e

# 添加: 每天凌晨 2 点备份
0 2 * * * /root/backup-db.sh
```

### 3. 日志轮转

创建 PM2 日志轮转:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
```

---

## 八、监控和告警

### 1. 设置 PM2 Web 监控 (可选)

```bash
# 安装 pm2-web
npm install -g pm2-web

# 启动 Web 监控
pm2-web --port 9000

# 访问: http://43.157.40.96:9000
```

### 2. 健康检查脚本

创建 `/root/health-check.sh`:
```bash
#!/bin/bash

# 检查 Worker 状态
STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="moreyudeals-worker") | .pm2_env.status')

if [ "$STATUS" != "online" ]; then
    echo "⚠️ Worker 服务异常: $STATUS"
    pm2 restart moreyudeals-worker
    echo "已尝试重启服务"
fi

# 检查数据库
COUNT=$(PGPASSWORD=bTXsPFtiLb7tNH87 psql -h 43.157.40.96 -p 5432 -U moreyu_admin -d moreyudeals -tAc "SELECT COUNT(*) FROM deals WHERE created_at > NOW() - INTERVAL '1 hour';")

if [ "$COUNT" -eq 0 ]; then
    echo "⚠️ 过去 1 小时无新数据"
fi
```

---

## 九、下一步: 部署 Web 到 Vercel

完成服务器部署后，继续部署 Web 前端到 Vercel。

请查看: [VERCEL-DEPLOYMENT.md](./VERCEL-DEPLOYMENT.md)

---

## 十、检查清单

- [ ] 服务器环境准备完成 (Node.js, PM2, Git)
- [ ] 数据库初始化完成 (运行 init-database.sh)
- [ ] 代码克隆到服务器 (/var/www/Moreyudeals)
- [ ] Worker 依赖安装完成 (npm install)
- [ ] Worker 构建完成 (npm run build)
- [ ] Worker 服务启动成功 (pm2 list 显示 online)
- [ ] 手动测试抓取成功
- [ ] 数据库验证通过 (有数据且商家覆盖率 >= 95%)
- [ ] PM2 开机自启配置完成 (pm2 startup && pm2 save)
- [ ] 日志监控正常 (pm2 logs 无错误)
- [ ] 定期备份配置完成 (crontab)

---

**联系**: 如有问题，请检查日志并参考故障排查章节。
**最后更新**: 2025-10-19
