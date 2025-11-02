# Moreyudeals Ubuntu 服务器部署指南

**版本**: v2.0 (基于 T10 验证)
**更新日期**: 2025-11-02
**适用环境**: Ubuntu 20.04+ / Debian 11+
**服务器**: 腾讯云轻量服务器 43.157.40.96

---

## 📋 目录

1. [部署架构](#部署架构)
2. [前置准备](#前置准备)
3. [快速部署](#快速部署)
4. [详细部署步骤](#详细部署步骤)
5. [配置管理](#配置管理)
6. [运维管理](#运维管理)
7. [监控和维护](#监控和维护)
8. [故障排查](#故障排查)
9. [安全加固](#安全加固)
10. [常见问题](#常见问题)

---

## 部署架构

```
┌─────────────────────────────────────────────┐
│      腾讯云服务器 (43.157.40.96)             │
├─────────────────────────────────────────────┤
│  PostgreSQL 15.5 (本地)                      │
│  ├─ moreyudeals 数据库                       │
│  └─ 128 条优惠数据 (已验证)                  │
│                                              │
│  Worker 服务 (PM2管理)                       │
│  ├─ 抓取模块: Sparhamster RSS               │
│  ├─ 去重模块: 基于GUID和内容哈希             │
│  ├─ 翻译模块: DeepL (可选启用)               │
│  └─ 调度器: 30分钟间隔 + 随机延迟            │
└─────────────────────────────────────────────┘
         ↓ 数据输出 (计划中)
┌─────────────────────────────────────────────┐
│          Vercel (Web前端)                    │
│  Next.js + PostgreSQL直连                    │
└─────────────────────────────────────────────┘
```

### 核心组件

| 组件 | 版本 | 用途 |
|------|------|------|
| Ubuntu | 20.04+ | 操作系统 |
| Node.js | 18+ | 运行环境 |
| PostgreSQL | 15.5 | 数据库 |
| PM2 | 5.x | 进程管理 |
| Git | 2.x | 代码管理 |

### 已验证功能 (T10测试)

✅ **抓取模块**
- API抓取: 40条/次
- HTML抓取: 3页
- 商家识别: 75% 成功率
- 去重: 100% 准确率

✅ **翻译模块**
- DeepL翻译: 6/6 成功
- 平均耗时: 标题 250ms, HTML 950ms
- 翻译质量: 良好

✅ **数据库**
- 总记录: 128条
- 已翻译: 127条
- 无数据损坏

---

## 前置准备

### 1. 服务器要求

| 项目 | 最小配置 | 推荐配置 |
|------|---------|---------|
| CPU | 1核 | 2核+ |
| 内存 | 2GB | 4GB+ |
| 硬盘 | 20GB | 40GB+ |
| 带宽 | 1Mbps | 3Mbps+ |

### 2. 域名和DNS (可选)

如果需要对外提供API服务:
- 域名: `api.moreyu.com` (示例)
- SSL证书: Let's Encrypt

### 3. 账号准备

- 服务器 root 或 sudo 权限
- GitHub 账号 (用于克隆代码)
- DeepL API Key (如需翻译功能)

### 4. 安全组配置

在云服务器控制台打开以下端口:

| 端口 | 协议 | 用途 | 允许来源 |
|------|------|------|---------|
| 22 | TCP | SSH | 你的IP |
| 5432 | TCP | PostgreSQL | 127.0.0.1 (仅本地) |
| 80 | TCP | HTTP (可选) | 0.0.0.0/0 |
| 443 | TCP | HTTPS (可选) | 0.0.0.0/0 |

---

## 快速部署

### 一键部署 (推荐)

```bash
# 1. SSH登录服务器
ssh root@43.157.40.96

# 2. 克隆代码
git clone https://github.com/PRYePR/moreyudeals.git /www/wwwroot/Moreyudeals
cd /www/wwwroot/Moreyudeals

# 3. 授予脚本执行权限
chmod +x scripts/*.sh

# 4. 初始化数据库
sudo bash scripts/init-database-server.sh

# 5. 一键部署
bash scripts/deploy-server.sh

# 6. 检查服务状态
pm2 status
pm2 logs moreyudeals-worker --lines 50
```

### 验证部署

```bash
# 查看服务状态 (应该显示 online)
pm2 list

# 查看最新数据
PGPASSWORD=338e930fbb psql -h localhost -p 5432 -U moreyudeals -d moreyudeals \
  -c "SELECT COUNT(*) FROM deals WHERE created_at > NOW() - INTERVAL '1 hour';"

# 查看日志
tail -f ~/.pm2/logs/moreyudeals-worker-out.log
```

---

## 详细部署步骤

### 步骤 1: 环境安装

#### 1.1 更新系统

```bash
sudo apt update && sudo apt upgrade -y
```

#### 1.2 安装 Node.js 18

```bash
# 添加 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# 安装 Node.js
sudo apt install -y nodejs

# 验证
node --version  # 应该显示 v18.x.x
npm --version   # 应该显示 9.x.x
```

#### 1.3 安装 PM2

```bash
# 全局安装
sudo npm install -g pm2

# 设置开机自启
pm2 startup
# 执行输出的命令 (通常是 sudo env PATH=...)

# 验证
pm2 --version
```

#### 1.4 安装 PostgreSQL 15

```bash
# 添加 PostgreSQL 官方仓库
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# 安装 PostgreSQL 15
sudo apt update
sudo apt install -y postgresql-15 postgresql-client-15

# 启动并启用
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 验证
sudo -u postgres psql -c "SELECT version();"
```

#### 1.5 安装 Git

```bash
sudo apt install -y git

# 配置 (可选)
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

#### 1.6 安装其他工具

```bash
# 安装必要工具
sudo apt install -y curl wget vim htop

# 安装构建工具 (可选，某些npm包需要)
sudo apt install -y build-essential
```

### 步骤 2: 数据库初始化

#### 2.1 配置 PostgreSQL

```bash
# 切换到 postgres 用户
sudo -i -u postgres

# 进入 psql
psql

# 创建数据库和用户
CREATE DATABASE moreyudeals;
CREATE USER moreyudeals WITH PASSWORD '338e930fbb';
GRANT ALL PRIVILEGES ON DATABASE moreyudeals TO moreyudeals;

# 授予public schema权限
\c moreyudeals
GRANT ALL PRIVILEGES ON SCHEMA public TO moreyudeals;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO moreyudeals;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO moreyudeals;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO moreyudeals;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO moreyudeals;

# 退出
\q
exit
```

#### 2.2 运行迁移脚本

```bash
cd /www/wwwroot/Moreyudeals
sudo bash scripts/init-database-server.sh
```

**预期输出**:
```
✓ 权限检查通过
✓ 数据库已就绪
✓ 用户配置完成
✓ 权限授予完成
✓ 001_initial_schema.sql 完成
✓ 002_add_indexes.sql 完成
...
✓ 数据库初始化成功
```

#### 2.3 验证表结构

```bash
PGPASSWORD=338e930fbb psql -h localhost -p 5432 -U moreyudeals -d moreyudeals -c "\dt"
```

应该看到以下表:
- `deals` - 优惠主表
- `data_sources` - 数据源配置

### 步骤 3: 克隆代码

```bash
# 创建部署目录
sudo mkdir -p /www/wwwroot
cd /www/wwwroot

# 克隆仓库
sudo git clone https://github.com/PRYePR/moreyudeals.git Moreyudeals

# 设置权限
sudo chown -R $USER:$USER Moreyudeals

# 进入项目
cd Moreyudeals

# 切换到最新分支
git checkout latest-2025
```

### 步骤 4: 安装依赖

```bash
cd /www/wwwroot/Moreyudeals

# 安装根目录依赖 (如果是monorepo)
npm install

# 安装Worker依赖
cd packages/worker
npm install

# 验证依赖
npm list --depth=0
```

### 步骤 5: 创建配置文件

创建生产环境配置:

```bash
cd /www/wwwroot/Moreyudeals/packages/worker
nano .env.production
```

**基础配置** (最小化):
```env
# === 数据库配置 ===
DB_HOST=localhost
DB_PORT=5432
DB_NAME=moreyudeals
DB_USER=moreyudeals
DB_PASSWORD=338e930fbb

# === Sparhamster API 配置 ===
SPARHAMSTER_API_URL=https://www.sparhamster.at/wp-json/wp/v2/posts
SPARHAMSTER_API_LIMIT=40
SPARHAMSTER_BASE_URL=https://www.sparhamster.at
SPARHAMSTER_TOKEN=0ccb1264cd81ad8e20f27dd146dfa37d
SPARHAMSTER_USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36

# === 抓取配置 ===
FETCH_INTERVAL=30
FETCH_RANDOM_DELAY_MIN=0
FETCH_RANDOM_DELAY_MAX=5

# === 翻译配置 (默认关闭) ===
TRANSLATION_ENABLED=false
TRANSLATION_BATCH_SIZE=10
TRANSLATION_TARGET_LANGUAGES=zh,en

# === DeepL API 配置 (如需翻译) ===
# DEEPL_API_KEY=your_key_here
# DEEPL_ENDPOINT=https://api-free.deepl.com/v2

# === 日志配置 ===
LOG_LEVEL=info
NODE_ENV=production
```

保存并退出 (Ctrl+O, Enter, Ctrl+X)

### 步骤 6: 构建项目

```bash
cd /www/wwwroot/Moreyudeals/packages/worker

# 编译 TypeScript
npm run build

# 验证构建
ls -la dist/
```

应该看到 `dist/index.js` 等文件

### 步骤 7: 创建日志目录

```bash
cd /www/wwwroot/Moreyudeals/packages/worker
mkdir -p logs
```

### 步骤 8: 启动服务

```bash
cd /www/wwwroot/Moreyudeals/packages/worker

# 使用 PM2 启动
pm2 start ecosystem.config.js --env production

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
# 执行输出的 sudo 命令

# 查看状态
pm2 status
pm2 logs moreyudeals-worker --lines 50
```

### 步骤 9: 验证部署

#### 9.1 检查进程状态

```bash
pm2 list
```

**预期输出**:
```
┌─────┬────────────────────────┬─────────┬─────────┬─────────┬──────────┐
│ id  │ name                   │ mode    │ status  │ restart │ uptime   │
├─────┼────────────────────────┼─────────┼─────────┼─────────┼──────────┤
│ 0   │ moreyudeals-worker     │ fork    │ online  │ 0       │ 5s       │
└─────┴────────────────────────┴─────────┴─────────┴─────────┴──────────┘
```

#### 9.2 查看实时日志

```bash
pm2 logs moreyudeals-worker -f
```

**应该看到**:
```
🚀 启动 Moreyudeals Worker 服务
📦 配置信息:
  - 数据库: localhost:5432/moreyudeals
  - 抓取间隔: 30 分钟
  - 翻译: 禁用
✅ 数据库连接成功
🔄 执行首次抓取...
📊 抓取任务完成:
  - 获取记录: 40
  - 新增记录: 6
  - 重复记录: 34
```

#### 9.3 检查数据库数据

```bash
PGPASSWORD=338e930fbb psql -h localhost -p 5432 -U moreyudeals -d moreyudeals \
  -c "SELECT COUNT(*) as total,
             COUNT(CASE WHEN created_at > NOW() - INTERVAL '10 minutes' THEN 1 END) as recent
      FROM deals;"
```

#### 9.4 验证商家提取

```bash
PGPASSWORD=338e930fbb psql -h localhost -p 5432 -U moreyudeals -d moreyudeals \
  -c "SELECT
        LEFT(title, 40) as title,
        merchant,
        LEFT(merchant_link, 50) as link
      FROM deals
      WHERE created_at > NOW() - INTERVAL '10 minutes'
      LIMIT 5;"
```

**验证点**:
- ✅ merchant 应该是真实商家 (不是 "sparhamster")
- ✅ merchant_link 应该包含 "forward.sparhamster.at"
- ✅ 有新增数据

---

## 配置管理

### 环境变量说明

#### 必需配置

| 变量 | 说明 | 示例 |
|------|------|------|
| `DB_HOST` | 数据库主机 | localhost |
| `DB_PORT` | 数据库端口 | 5432 |
| `DB_NAME` | 数据库名称 | moreyudeals |
| `DB_USER` | 数据库用户 | moreyudeals |
| `DB_PASSWORD` | 数据库密码 | 你的密码 |
| `SPARHAMSTER_API_URL` | API地址 | https://www.sparhamster.at/wp-json/wp/v2/posts |
| `SPARHAMSTER_BASE_URL` | 网站地址 | https://www.sparhamster.at |

#### 可选配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `FETCH_INTERVAL` | 抓取间隔(分钟) | 30 |
| `FETCH_RANDOM_DELAY_MIN` | 随机延迟最小值(分钟) | 0 |
| `FETCH_RANDOM_DELAY_MAX` | 随机延迟最大值(分钟) | 5 |
| `TRANSLATION_ENABLED` | 启用翻译 | false |
| `TRANSLATION_BATCH_SIZE` | 翻译批次大小 | 10 |
| `DEEPL_API_KEY` | DeepL API密钥 | - |
| `LOG_LEVEL` | 日志级别 | info |

### ecosystem.config.js 说明

PM2配置文件位置: `/www/wwwroot/Moreyudeals/packages/worker/ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'moreyudeals-worker',      // 应用名称
    script: 'dist/index.js',          // 启动脚本
    instances: 1,                     // 实例数量
    exec_mode: 'fork',                // 执行模式
    autorestart: true,                // 自动重启
    watch: false,                     // 不监控文件变化
    max_memory_restart: '1G',         // 内存限制
    env: {
      NODE_ENV: 'production',
      // ... 环境变量
    },
    error_file: 'logs/error.log',    // 错误日志
    out_file: 'logs/out.log',        // 输出日志
    merge_logs: true,                 // 合并日志
    time: true                        // 日志时间戳
  }]
};
```

### 启用翻译功能

如果需要启用翻译:

```bash
# 编辑配置
nano /www/wwwroot/Moreyudeals/packages/worker/.env.production
```

修改以下配置:
```env
TRANSLATION_ENABLED=true
DEEPL_API_KEY=1f7dff02-4dff-405f-94db-0d1ee398130f:fx
DEEPL_ENDPOINT=https://api-free.deepl.com/v2
```

重启服务:
```bash
pm2 restart moreyudeals-worker
```

---

## 运维管理

### PM2 常用命令

```bash
# === 查看状态 ===
pm2 list                              # 列出所有进程
pm2 status                            # 同上
pm2 show moreyudeals-worker           # 查看详细信息
pm2 monit                             # 实时监控

# === 日志管理 ===
pm2 logs moreyudeals-worker           # 查看日志
pm2 logs moreyudeals-worker -f        # 实时日志
pm2 logs moreyudeals-worker --lines 100  # 最近100行
pm2 logs moreyudeals-worker --err     # 仅错误日志
pm2 flush                             # 清空日志

# === 进程管理 ===
pm2 restart moreyudeals-worker        # 重启
pm2 reload moreyudeals-worker         # 平滑重启
pm2 stop moreyudeals-worker           # 停止
pm2 start moreyudeals-worker          # 启动
pm2 delete moreyudeals-worker         # 删除

# === 配置管理 ===
pm2 save                              # 保存当前进程列表
pm2 resurrect                         # 恢复进程列表
pm2 startup                           # 生成开机启动脚本
pm2 unstartup                         # 禁用开机启动
```

### 代码更新流程

#### 方法 1: 使用自动脚本 (推荐)

```bash
cd /www/wwwroot/Moreyudeals
bash scripts/update-server.sh
```

脚本会自动:
1. 拉取最新代码
2. 安装新依赖
3. 重新构建
4. 重启服务

#### 方法 2: 手动更新

```bash
# 1. 进入项目目录
cd /www/wwwroot/Moreyudeals

# 2. 拉取最新代码
git pull origin latest-2025

# 3. 安装依赖 (如有变化)
cd packages/worker
npm install

# 4. 重新构建
npm run build

# 5. 重启服务
pm2 restart moreyudeals-worker

# 6. 查看日志
pm2 logs moreyudeals-worker --lines 50
```

### 数据库管理

#### 连接数据库

```bash
# 本地连接
PGPASSWORD=338e930fbb psql -h localhost -p 5432 -U moreyudeals -d moreyudeals

# 或使用sudo
sudo -u postgres psql -d moreyudeals
```

#### 常用SQL命令

```sql
-- 查看所有表
\dt

-- 查看表结构
\d deals

-- 查看记录数
SELECT COUNT(*) FROM deals;

-- 查看最新记录
SELECT id, LEFT(title, 50) as title, merchant, created_at
FROM deals
ORDER BY created_at DESC
LIMIT 10;

-- 查看翻译状态分布
SELECT translation_status, COUNT(*) as count
FROM deals
GROUP BY translation_status;

-- 查看商家分布
SELECT merchant, COUNT(*) as count
FROM deals
WHERE merchant IS NOT NULL
GROUP BY merchant
ORDER BY count DESC
LIMIT 20;

-- 删除旧数据 (30天前)
DELETE FROM deals WHERE created_at < NOW() - INTERVAL '30 days';

-- 清空表 (慎用!)
TRUNCATE TABLE deals;
```

#### 数据库备份

**创建备份脚本**:

```bash
# 创建备份目录
sudo mkdir -p /backups/moreyudeals
sudo chown $USER:$USER /backups/moreyudeals

# 创建备份脚本
cat > /backups/backup-db.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/backups/moreyudeals"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="moreyudeals_${DATE}.sql.gz"

# 备份数据库
PGPASSWORD=338e930fbb pg_dump \
  -h localhost \
  -p 5432 \
  -U moreyudeals \
  moreyudeals \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

# 保留最近7天
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +7 -delete

echo "✓ 备份完成: ${FILENAME}"
EOF

chmod +x /backups/backup-db.sh
```

**设置定时备份**:

```bash
# 编辑crontab
crontab -e

# 添加: 每天凌晨2点备份
0 2 * * * /backups/backup-db.sh >> /backups/backup.log 2>&1
```

**手动备份**:

```bash
# 立即执行备份
/backups/backup-db.sh

# 或手动备份
PGPASSWORD=338e930fbb pg_dump \
  -h localhost \
  -p 5432 \
  -U moreyudeals \
  moreyudeals \
  > moreyudeals_$(date +%Y%m%d).sql
```

**恢复备份**:

```bash
# 解压并恢复
gunzip -c /backups/moreyudeals/moreyudeals_20251102_020000.sql.gz | \
PGPASSWORD=338e930fbb psql -h localhost -p 5432 -U moreyudeals -d moreyudeals
```

---

## 监控和维护

### 系统资源监控

```bash
# 实时监控
htop

# 内存使用
free -h

# 磁盘使用
df -h

# PM2 监控
pm2 monit

# 查看进程资源
pm2 status
```

### 日志管理

**日志位置**:
- PM2日志: `~/.pm2/logs/`
- Worker日志: `/www/wwwroot/Moreyudeals/packages/worker/logs/`
- PostgreSQL日志: `/var/log/postgresql/`

**查看日志**:

```bash
# PM2日志
pm2 logs moreyudeals-worker --lines 100

# Worker自定义日志
tail -f /www/wwwroot/Moreyudeals/packages/worker/logs/out.log

# PostgreSQL日志
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

**日志轮转**:

```bash
# 安装PM2日志轮转模块
pm2 install pm2-logrotate

# 配置
pm2 set pm2-logrotate:max_size 100M     # 单个文件最大100MB
pm2 set pm2-logrotate:retain 7          # 保留7个文件
pm2 set pm2-logrotate:compress true     # 压缩旧日志
```

### 健康检查脚本

创建 `/root/health-check.sh`:

```bash
#!/bin/bash

# 检查Worker服务状态
STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="moreyudeals-worker") | .pm2_env.status' 2>/dev/null)

if [ "$STATUS" != "online" ]; then
    echo "[$(date)] ⚠️ Worker服务异常: $STATUS"
    pm2 restart moreyudeals-worker
    echo "[$(date)] 已尝试重启服务"
fi

# 检查数据库连接
DB_CHECK=$(PGPASSWORD=338e930fbb psql -h localhost -p 5432 -U moreyudeals -d moreyudeals -tAc "SELECT 1;" 2>/dev/null)

if [ "$DB_CHECK" != "1" ]; then
    echo "[$(date)] ⚠️ 数据库连接失败"
fi

# 检查最近1小时是否有新数据
RECENT_COUNT=$(PGPASSWORD=338e930fbb psql -h localhost -p 5432 -U moreyudeals -d moreyudeals -tAc "SELECT COUNT(*) FROM deals WHERE created_at > NOW() - INTERVAL '1 hour';" 2>/dev/null)

if [ "$RECENT_COUNT" -eq 0 ]; then
    echo "[$(date)] ⚠️ 过去1小时无新数据"
fi

# 检查磁盘空间
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "[$(date)] ⚠️ 磁盘使用率过高: ${DISK_USAGE}%"
fi
```

设置定时检查:
```bash
chmod +x /root/health-check.sh
crontab -e

# 每小时检查一次
0 * * * * /root/health-check.sh >> /var/log/health-check.log 2>&1
```

---

## 故障排查

### 问题 1: Worker无法启动

**症状**: `pm2 list` 显示 `errored` 或 `stopped`

**排查步骤**:

```bash
# 1. 查看错误日志
pm2 logs moreyudeals-worker --err --lines 50

# 2. 检查构建是否成功
ls -la /www/wwwroot/Moreyudeals/packages/worker/dist/

# 3. 手动运行看详细错误
cd /www/wwwroot/Moreyudeals/packages/worker
node dist/index.js

# 4. 检查配置文件
cat ecosystem.config.js
```

**常见原因**:
- 数据库连接失败 → 检查数据库密码和网络
- 依赖缺失 → 运行 `npm install`
- 构建失败 → 运行 `npm run build`
- 端口占用 → 检查其他进程

### 问题 2: 数据库连接失败

**症状**: 日志显示 "ECONNREFUSED" 或 "authentication failed"

**解决方案**:

```bash
# 1. 检查PostgreSQL是否运行
sudo systemctl status postgresql

# 2. 启动PostgreSQL
sudo systemctl start postgresql

# 3. 测试连接
PGPASSWORD=338e930fbb psql -h localhost -p 5432 -U moreyudeals -d moreyudeals -c "SELECT 1;"

# 4. 检查pg_hba.conf
sudo cat /etc/postgresql/15/main/pg_hba.conf | grep moreyudeals

# 5. 检查密码是否正确
sudo -u postgres psql -c "\du moreyudeals"

# 6. 重置密码 (如需要)
sudo -u postgres psql -c "ALTER USER moreyudeals WITH PASSWORD '338e930fbb';"
```

### 问题 3: 无新数据抓取

**症状**: 数据库长时间无新记录

**排查步骤**:

```bash
# 1. 查看日志
pm2 logs moreyudeals-worker | grep "抓取"

# 2. 检查网络连接
curl -I https://www.sparhamster.at

# 3. 手动测试抓取
cd /www/wwwroot/Moreyudeals/packages/worker
TRANSLATION_ENABLED=false npx tsx src/index.ts

# 4. 检查数据源配置
PGPASSWORD=338e930fbb psql -h localhost -p 5432 -U moreyudeals -d moreyudeals \
  -c "SELECT * FROM data_sources;"

# 5. 查看最近错误
pm2 logs moreyudeals-worker --err --lines 100
```

### 问题 4: 内存占用过高

**症状**: PM2显示内存超过1GB

**解决方案**:

```bash
# 1. 查看内存使用
pm2 status
free -h

# 2. 重启服务
pm2 restart moreyudeals-worker

# 3. 调整内存限制
# 编辑 ecosystem.config.js
nano /www/wwwroot/Moreyudeals/packages/worker/ecosystem.config.js

# 修改: max_memory_restart: '500M'

# 4. 重新启动
pm2 delete moreyudeals-worker
pm2 start ecosystem.config.js --env production
pm2 save
```

### 问题 5: 翻译失败

**症状**: 日志显示翻译错误，translation_status 为 failed

**解决方案**:

```bash
# 1. 检查DeepL API Key是否有效
curl -X POST "https://api-free.deepl.com/v2/translate" \
  -d "auth_key=YOUR_API_KEY" \
  -d "text=Hello" \
  -d "target_lang=ZH"

# 2. 检查配置
cat /www/wwwroot/Moreyudeals/packages/worker/.env.production | grep DEEPL

# 3. 查看翻译错误日志
pm2 logs moreyudeals-worker | grep "翻译"

# 4. 重试失败的翻译
PGPASSWORD=338e930fbb psql -h localhost -p 5432 -U moreyudeals -d moreyudeals \
  -c "UPDATE deals SET translation_status = 'pending' WHERE translation_status = 'failed';"

# 5. 重启服务
pm2 restart moreyudeals-worker
```

### 问题 6: 磁盘空间不足

**症状**: 日志显示 "ENOSPC" 或磁盘使用率 > 90%

**解决方案**:

```bash
# 1. 检查磁盘使用
df -h
du -sh /www/wwwroot/Moreyudeals/* | sort -h

# 2. 清理PM2日志
pm2 flush

# 3. 清理旧日志
find ~/.pm2/logs -name "*.log" -mtime +7 -delete
find /www/wwwroot/Moreyudeals/packages/worker/logs -name "*.log" -mtime +7 -delete

# 4. 清理系统日志
sudo journalctl --vacuum-time=7d

# 5. 清理旧数据 (慎用)
PGPASSWORD=338e930fbb psql -h localhost -p 5432 -U moreyudeals -d moreyudeals \
  -c "DELETE FROM deals WHERE created_at < NOW() - INTERVAL '60 days';"
```

---

## 安全加固

### 1. 防火墙配置

```bash
# 安装ufw
sudo apt install -y ufw

# 允许SSH
sudo ufw allow 22/tcp

# 禁止PostgreSQL外部访问
sudo ufw deny 5432/tcp

# 启用防火墙
sudo ufw enable

# 检查状态
sudo ufw status verbose
```

### 2. PostgreSQL安全

```bash
# 编辑 postgresql.conf
sudo nano /etc/postgresql/15/main/postgresql.conf

# 确保只监听本地
# listen_addresses = 'localhost'

# 编辑 pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf

# 确保只允许本地连接
# local   all             all                                     peer
# host    all             all             127.0.0.1/32            md5

# 重启PostgreSQL
sudo systemctl restart postgresql
```

### 3. SSH安全

```bash
# 编辑SSH配置
sudo nano /etc/ssh/sshd_config

# 建议修改:
# Port 2222                      # 改端口
# PermitRootLogin no             # 禁止root登录
# PasswordAuthentication no      # 禁用密码登录，只允许密钥
# PubkeyAuthentication yes       # 启用公钥认证

# 重启SSH
sudo systemctl restart sshd
```

### 4. 自动安全更新

```bash
# 安装unattended-upgrades
sudo apt install -y unattended-upgrades

# 启用自动更新
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### 5. 日志审计

```bash
# 查看登录历史
last -20

# 查看失败的登录尝试
sudo grep "Failed password" /var/log/auth.log | tail -20

# 查看sudo使用记录
sudo grep "sudo" /var/log/auth.log | tail -20
```

---

## 常见问题

### Q1: 如何修改抓取间隔?

**A**: 修改配置文件中的 `FETCH_INTERVAL`

```bash
# 编辑配置
nano /www/wwwroot/Moreyudeals/packages/worker/.env.production

# 修改为60分钟
FETCH_INTERVAL=60

# 重启服务
pm2 restart moreyudeals-worker
```

### Q2: 如何临时启用翻译测试?

**A**: 使用环境变量覆盖

```bash
cd /www/wwwroot/Moreyudeals/packages/worker
TRANSLATION_ENABLED=true npx tsx src/index.ts
```

### Q3: 数据库可以从外部访问吗?

**A**: 出于安全考虑，默认只允许本地访问。如需外部访问:

```bash
# 1. 修改PostgreSQL配置
sudo nano /etc/postgresql/15/main/postgresql.conf
# 修改: listen_addresses = '*'

# 2. 修改pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf
# 添加: host    moreyudeals    moreyudeals    YOUR_IP/32    md5

# 3. 重启PostgreSQL
sudo systemctl restart postgresql

# 4. 开放防火墙
sudo ufw allow from YOUR_IP to any port 5432
```

### Q4: 如何查看实时抓取进度?

**A**:

```bash
# 方法1: PM2日志
pm2 logs moreyudeals-worker -f

# 方法2: Worker日志文件
tail -f /www/wwwroot/Moreyudeals/packages/worker/logs/out.log

# 方法3: 数据库查询
watch -n 10 "PGPASSWORD=338e930fbb psql -h localhost -p 5432 -U moreyudeals -d moreyudeals -tAc 'SELECT COUNT(*) FROM deals;'"
```

### Q5: 如何清空所有数据重新开始?

**A**:

```bash
# 1. 停止服务
pm2 stop moreyudeals-worker

# 2. 清空deals表
PGPASSWORD=338e930fbb psql -h localhost -p 5432 -U moreyudeals -d moreyudeals \
  -c "TRUNCATE TABLE deals;"

# 3. 重启服务
pm2 restart moreyudeals-worker
```

### Q6: 服务器重启后如何恢复?

**A**: 如果已配置PM2开机自启，服务会自动恢复。否则:

```bash
# 1. 启动PostgreSQL
sudo systemctl start postgresql

# 2. 启动Worker
pm2 resurrect

# 或手动启动
cd /www/wwwroot/Moreyudeals/packages/worker
pm2 start ecosystem.config.js --env production
```

---

## 附录

### 目录结构

```
/www/wwwroot/Moreyudeals/
├── packages/
│   └── worker/
│       ├── src/                 # 源代码
│       ├── dist/                # 编译后代码
│       ├── migrations/          # 数据库迁移
│       ├── logs/                # 日志目录
│       ├── .env.production      # 生产环境配置
│       ├── ecosystem.config.js  # PM2配置
│       └── package.json
├── scripts/
│   ├── deploy-server.sh         # 部署脚本
│   ├── init-database-server.sh  # 数据库初始化
│   └── update-server.sh         # 更新脚本
└── README.md
```

### 端口使用

| 端口 | 服务 | 访问范围 |
|------|------|---------|
| 22 | SSH | 限制IP |
| 5432 | PostgreSQL | 仅本地 |
| 80 | HTTP (可选) | 公网 |
| 443 | HTTPS (可选) | 公网 |

### 性能基准 (基于T10验证)

| 指标 | 数值 |
|------|------|
| 单次抓取耗时 | ~2.2秒 |
| API请求数 | 40条/次 |
| 新增记录 | 6条/次 (平均) |
| 重复记录 | 34条/次 (平均) |
| 标题翻译耗时 | ~250ms |
| HTML翻译耗时 | ~950ms |
| 翻译成功率 | 100% |
| 商家识别率 | 75% |
| 内存占用 | < 200MB |
| CPU占用 | < 5% (空闲时) |

### 联系与支持

- **技术支持**: support@moreyu.com
- **GitHub**: https://github.com/PRYePR/moreyudeals
- **文档更新**: 2025-11-02

---

**祝部署顺利！**
