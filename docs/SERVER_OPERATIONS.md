# 服务器端操作指令

> Worker 和 API 服务的部署、构建、重启、查询操作手册

---

## 快速参考

| 操作 | 命令 |
|------|------|
| 查看所有进程状态 | `pm2 list` |
| 查看实时日志 | `pm2 logs` |
| 重启所有服务 | `pm2 restart all` |
| 拉取最新代码并部署 | `bash scripts/auto-deploy.sh` |
| 手动部署 | `bash scripts/manual-deploy.sh` |
| 查看部署日志 | `tail -f /var/log/moreyudeals-deploy.log` |

---

## 1. 代码拉取

### 1.1 自动拉取（推荐）
```bash
# 自动检查更新并部署（每5分钟执行一次）
bash /var/www/Moreyudeals/scripts/auto-deploy.sh
```

### 1.2 手动拉取
```bash
cd /var/www/Moreyudeals

# 拉取最新代码
git pull origin main

# 如果有冲突，强制覆盖本地更改
git fetch origin
git reset --hard origin/main
```

### 1.3 检查当前版本
```bash
cd /var/www/Moreyudeals
git log -1 --oneline
git status
```

---

## 2. 构建

### 2.1 构建 API
```bash
cd /var/www/Moreyudeals/packages/api

# 安装依赖（首次或 package.json 变更时）
npm install

# 编译 TypeScript
npm run build

# 验证构建产物
ls -lh dist/
```

### 2.2 构建 Worker
```bash
cd /var/www/Moreyudeals/packages/worker

# 安装依赖
npm install

# 编译 TypeScript
npm run build

# 验证构建产物
ls -lh dist/
```

### 2.3 构建 Translation（依赖包）
```bash
cd /var/www/Moreyudeals/packages/translation

# 安装依赖并构建
npm install
npm run build
```

### 2.4 一键构建所有服务
```bash
cd /var/www/Moreyudeals

# 构建 translation（必须先构建）
cd packages/translation && npm install && npm run build

# 构建 API
cd ../api && npm install && npm run build

# 构建 Worker
cd ../worker && npm install && npm run build
```

---

## 3. PM2 进程管理

### 3.1 查看进程状态
```bash
# 查看所有进程
pm2 list

# 详细信息（包括内存、CPU、重启次数）
pm2 show moreyudeals-api
pm2 show moreyudeals-worker

# 实时监控
pm2 monit
```

### 3.2 启动服务
```bash
# 首次启动 API
pm2 start /var/www/Moreyudeals/packages/api/dist/index.js \
  --name moreyudeals-api \
  --max-memory-restart 500M \
  --time

# 首次启动 Worker
pm2 start /var/www/Moreyudeals/packages/worker/dist/index.js \
  --name moreyudeals-worker \
  --max-memory-restart 500M \
  --time
```

### 3.3 重启服务
```bash
# 重启单个服务（无停机）
pm2 reload moreyudeals-api
pm2 reload moreyudeals-worker

# 重启单个服务（有停机）
pm2 restart moreyudeals-api
pm2 restart moreyudeals-worker

# 重启所有服务
pm2 restart all

# 重启并清空日志
pm2 flush
pm2 restart all
```

### 3.4 停止服务
```bash
# 停止单个服务
pm2 stop moreyudeals-api
pm2 stop moreyudeals-worker

# 停止所有服务
pm2 stop all
```

### 3.5 删除进程
```bash
# 删除单个进程（停止并移除）
pm2 delete moreyudeals-api
pm2 delete moreyudeals-worker

# 删除所有进程
pm2 delete all
```

### 3.6 保存进程配置
```bash
# 保存当前进程列表（开机自启）
pm2 save

# 配置开机自启
pm2 startup
```

---

## 4. 日志查看

### 4.1 PM2 日志
```bash
# 查看所有服务日志（实时）
pm2 logs

# 查看单个服务日志
pm2 logs moreyudeals-api
pm2 logs moreyudeals-worker

# 查看最近 100 行日志
pm2 logs --lines 100

# 查看错误日志
pm2 logs --err

# 清空所有日志
pm2 flush
```

### 4.2 部署日志
```bash
# 查看部署日志（实时）
tail -f /var/log/moreyudeals-deploy.log

# 查看最近 50 行
tail -n 50 /var/log/moreyudeals-deploy.log

# 搜索错误信息
grep -i error /var/log/moreyudeals-deploy.log

# 查看今天的部署记录
grep "$(date +%Y-%m-%d)" /var/log/moreyudeals-deploy.log
```

### 4.3 应用日志位置
```bash
# PM2 日志目录
~/.pm2/logs/

# API 日志
~/.pm2/logs/moreyudeals-api-out.log    # 标准输出
~/.pm2/logs/moreyudeals-api-error.log  # 错误日志

# Worker 日志
~/.pm2/logs/moreyudeals-worker-out.log
~/.pm2/logs/moreyudeals-worker-error.log
```

---

## 5. 服务健康检查

### 5.1 检查 API 服务
```bash
# 检查端口监听
lsof -i :3001

# 测试 API 响应
curl http://localhost:3001/health
curl http://localhost:3001/api/deals?limit=5

# 检查进程
ps aux | grep moreyudeals-api
```

### 5.2 检查 Worker 服务
```bash
# 检查进程
ps aux | grep moreyudeals-worker

# 查看最近执行情况
pm2 logs moreyudeals-worker --lines 50
```

### 5.3 检查数据库连接
```bash
# 进入 PostgreSQL
psql -U moreyudeals_user -d moreyudeals_db

# 检查数据
SELECT COUNT(*) FROM deals;
SELECT * FROM deals ORDER BY created_at DESC LIMIT 5;

# 退出
\q
```

### 5.4 检查 Redis 连接
```bash
# 连接 Redis
redis-cli

# 检查缓存键
KEYS translation:*
DBSIZE

# 退出
exit
```

### 5.5 一键健康检查脚本
```bash
bash /var/www/Moreyudeals/scripts/check-status.sh
```

---

## 6. 完整部署流程

### 6.1 自动部署（推荐）
```bash
# 执行自动部署脚本
bash /var/www/Moreyudeals/scripts/auto-deploy.sh

# 验证部署
pm2 list
pm2 logs --lines 20
```

### 6.2 手动部署流程
```bash
# 1. 拉取代码
cd /var/www/Moreyudeals
git pull origin main

# 2. 安装依赖（如有更新）
cd packages/translation && npm install && npm run build
cd ../api && npm install
cd ../worker && npm install

# 3. 构建
cd /var/www/Moreyudeals/packages/api && npm run build
cd /var/www/Moreyudeals/packages/worker && npm run build

# 4. 重启服务
pm2 reload moreyudeals-api
pm2 reload moreyudeals-worker

# 5. 验证
pm2 logs --lines 30
curl http://localhost:3001/health
```

### 6.3 首次部署
```bash
# 使用初始化部署脚本
bash /var/www/Moreyudeals/scripts/initial-deploy.sh
```

---

## 7. 故障排查

### 7.1 服务无法启动
```bash
# 查看详细错误
pm2 logs moreyudeals-api --err --lines 50

# 检查环境变量
cat /var/www/Moreyudeals/packages/api/.env

# 手动启动测试
cd /var/www/Moreyudeals/packages/api
node dist/index.js
```

### 7.2 构建失败
```bash
# 查看编译错误
cd /var/www/Moreyudeals/packages/api
npm run build 2>&1 | tee build-error.log

# 检查 TypeScript 版本
npm list typescript

# 清理并重新构建
rm -rf node_modules dist
npm install
npm run build
```

### 7.3 数据库连接失败
```bash
# 检查 PostgreSQL 状态
systemctl status postgresql

# 检查连接配置
cat /var/www/Moreyudeals/packages/api/.env | grep DB_

# 测试连接
psql -U moreyudeals_user -d moreyudeals_db -h localhost
```

### 7.4 内存不足
```bash
# 查看内存使用
pm2 list
free -h

# 重启占用内存过高的服务
pm2 reload moreyudeals-worker

# 设置内存限制（自动重启）
pm2 start dist/index.js --name moreyudeals-api --max-memory-restart 500M
```

---

## 8. 回滚操作

### 8.1 回滚到上一个版本
```bash
# 使用回滚脚本
bash /var/www/Moreyudeals/scripts/rollback.sh

# 或手动回滚
cd /var/www/Moreyudeals
git log --oneline -5
git reset --hard <commit-hash>
bash scripts/manual-deploy.sh
```

### 8.2 紧急停机
```bash
# 停止所有服务
pm2 stop all

# 或删除所有进程
pm2 delete all
```

---

## 9. 性能优化

### 9.1 清理日志
```bash
# 清理 PM2 日志
pm2 flush

# 清理部署日志（保留最近 1000 行）
tail -n 1000 /var/log/moreyudeals-deploy.log > /tmp/deploy.log
mv /tmp/deploy.log /var/log/moreyudeals-deploy.log
```

### 9.2 清理 Redis 缓存
```bash
redis-cli

# 清理过期缓存
FLUSHDB

# 或清理特定缓存
DEL translation:*
```

### 9.3 数据库维护
```bash
psql -U moreyudeals_user -d moreyudeals_db

-- 清理重复数据
DELETE FROM deals WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY original_url ORDER BY created_at) as rn
    FROM deals
  ) t WHERE rn > 1
);

-- 重建索引
REINDEX DATABASE moreyudeals_db;

-- 清理统计信息
VACUUM ANALYZE;
```

---

## 10. 环境变量配置

### 10.1 API 环境变量
```bash
# 编辑配置
nano /var/www/Moreyudeals/packages/api/.env
```

必需变量：
```env
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_USER=moreyudeals_user
DB_PASSWORD=your_password
DB_NAME=moreyudeals_db
```

### 10.2 Worker 环境变量
```bash
# 编辑配置
nano /var/www/Moreyudeals/packages/worker/.env
```

必需变量：
```env
NODE_ENV=production
DB_HOST=localhost
DB_PORT=5432
DB_USER=moreyudeals_user
DB_PASSWORD=your_password
DB_NAME=moreyudeals_db
REDIS_URL=redis://localhost:6379
DEEPL_API_KEY=your_key
MICROSOFT_API_KEY=your_key
```

---

## 11. Cron 任务管理

### 11.1 查看自动部署任务
```bash
crontab -l | grep auto-deploy
```

### 11.2 编辑 Cron 任务
```bash
crontab -e
```

示例配置：
```cron
# 每5分钟检查代码更新
*/5 * * * * /var/www/Moreyudeals/scripts/auto-deploy.sh

# 每天凌晨3点清理日志
0 3 * * * pm2 flush
```

### 11.3 查看 Cron 日志
```bash
grep CRON /var/log/syslog
```

---

## 12. 常用组合命令

### 快速重启
```bash
cd /var/www/Moreyudeals && \
git pull origin main && \
cd packages/api && npm run build && \
cd ../worker && npm run build && \
pm2 reload all && \
pm2 logs --lines 20
```

### 完整部署
```bash
bash /var/www/Moreyudeals/scripts/auto-deploy.sh && \
pm2 list && \
curl http://localhost:3001/health
```

### 查看所有状态
```bash
echo "=== Git Status ===" && \
cd /var/www/Moreyudeals && git log -1 --oneline && \
echo -e "\n=== PM2 Status ===" && \
pm2 list && \
echo -e "\n=== API Health ===" && \
curl -s http://localhost:3001/health | jq
```

---

## 附录：服务端口

| 服务 | 端口 | 用途 |
|------|------|------|
| API | 3001 | HTTP API |
| PostgreSQL | 5432 | 数据库 |
| Redis | 6379 | 缓存 |
| Strapi CMS | 1337 | CMS 管理 |

---

**最后更新**: 2025-11-10
