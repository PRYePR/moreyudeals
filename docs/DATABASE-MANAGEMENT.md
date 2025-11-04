# 数据库管理指南

本文档介绍如何管理 Moreyudeals 项目的数据库,包括清空、重新抓取、查看统计等操作。

## 📋 目录

- [快速操作](#快速操作)
- [脚本说明](#脚本说明)
- [常用操作](#常用操作)
- [数据库维护](#数据库维护)
- [故障排查](#故障排查)

## 🚀 快速操作

### 清空数据库并重新抓取

```bash
cd /var/www/moreyudeals
bash scripts/reset-and-fetch.sh
```

**流程说明**:
1. 停止 Worker 服务
2. 清空 `deals` 和 `data_sources` 表
3. 清理 Redis 缓存(如果启用)
4. 运行一次数据抓取(禁用翻译,加快速度)
5. 验证抓取结果
6. 询问是否重启服务

**注意**: 此操作会删除所有现有数据,请谨慎使用!

### 手动触发一次抓取

```bash
cd /var/www/moreyudeals
bash scripts/manual-fetch.sh
```

**适用场景**:
- 测试抓取功能
- 手动补充数据
- 不想等待定时任务

**特点**:
- 不删除现有数据
- 可选择是否启用翻译
- 立即执行一次抓取

### 查看数据库统计

```bash
cd /var/www/moreyudeals
bash scripts/db-stats.sh
```

**显示内容**:
- 总体统计(交易数、商家数、分类数)
- 按商家统计(Top 10)
- 按分类统计
- 翻译状态统计
- 最新10条记录
- 最近7天抓取统计
- 数据源状态

## 📜 脚本说明

### 1. reset-and-fetch.sh - 重置并重新抓取

**用途**: 清空数据库并从头开始抓取数据

**执行步骤**:
```bash
bash scripts/reset-and-fetch.sh
```

**确认提示**: 需要输入 `yes` 确认操作

**适用场景**:
- 首次部署后初始化数据
- 数据出现严重问题需要重置
- 切换数据源或抓取逻辑后清空旧数据

### 2. manual-fetch.sh - 手动抓取

**用途**: 手动触发一次数据抓取,不删除现有数据

**执行步骤**:
```bash
bash scripts/manual-fetch.sh
```

**交互选项**:
- 是否启用翻译 (y/n)

**适用场景**:
- 测试新的抓取逻辑
- 补充最新数据
- 调试抓取问题

### 3. db-stats.sh - 数据库统计

**用途**: 查看数据库详细统计信息

**执行步骤**:
```bash
bash scripts/db-stats.sh
```

**无需确认**: 只读操作,安全

**适用场景**:
- 日常监控数据量
- 检查抓取是否正常
- 查看翻译覆盖率

### 4. init-database-server.sh - 初始化数据库

**用途**: 创建数据库、用户、表结构

**执行步骤**:
```bash
sudo bash scripts/init-database-server.sh
```

**需要 sudo**: 需要 PostgreSQL 管理员权限

**适用场景**:
- 首次部署
- 重新创建数据库结构
- 迁移到新服务器

## 🔧 常用操作

### 场景1: 首次部署初始化数据

```bash
# 1. 初始化数据库结构
sudo bash scripts/init-database-server.sh

# 2. 重置并抓取数据
bash scripts/reset-and-fetch.sh
```

### 场景2: 数据出现问题,需要重置

```bash
# 1. 停止服务
pm2 stop moreyudeals-worker

# 2. 重置数据
bash scripts/reset-and-fetch.sh

# 服务会自动重启
```

### 场景3: 测试抓取功能

```bash
# 1. 手动抓取(不启用翻译,更快)
bash scripts/manual-fetch.sh

# 2. 查看结果
bash scripts/db-stats.sh
```

### 场景4: 监控数据增长

```bash
# 定期执行
bash scripts/db-stats.sh
```

### 场景5: 清空缓存重新翻译

```bash
# 1. 清空 Redis 缓存
redis-cli FLUSHDB

# 2. 清空翻译字段
PGPASSWORD=your_password psql -h localhost -U moreyudeals -d moreyudeals <<EOF
UPDATE deals SET
    title_zh = NULL,
    description_zh = NULL,
    title_en = NULL,
    description_en = NULL;
EOF

# 3. 重启服务(会自动重新翻译)
pm2 restart moreyudeals-worker
```

## 🗄️ 数据库维护

### 手动清空特定表

```bash
# 只清空 deals 表
PGPASSWORD=your_password psql -h localhost -U moreyudeals -d moreyudeals <<EOF
TRUNCATE TABLE deals RESTART IDENTITY CASCADE;
EOF
```

### 备份数据库

```bash
# 备份整个数据库
PGPASSWORD=your_password pg_dump -h localhost -U moreyudeals moreyudeals > backup_$(date +%Y%m%d).sql

# 只备份数据
PGPASSWORD=your_password pg_dump -h localhost -U moreyudeals --data-only moreyudeals > data_backup_$(date +%Y%m%d).sql
```

### 恢复数据库

```bash
# 恢复完整备份
PGPASSWORD=your_password psql -h localhost -U moreyudeals -d moreyudeals < backup_20251103.sql

# 只恢复数据
PGPASSWORD=your_password psql -h localhost -U moreyudeals -d moreyudeals < data_backup_20251103.sql
```

### 删除旧数据

```bash
# 删除30天前的数据
PGPASSWORD=your_password psql -h localhost -U moreyudeals -d moreyudeals <<EOF
DELETE FROM deals
WHERE created_at < NOW() - INTERVAL '30 days';
EOF
```

### 优化数据库

```bash
# 清理和优化表
PGPASSWORD=your_password psql -h localhost -U moreyudeals -d moreyudeals <<EOF
VACUUM ANALYZE deals;
VACUUM ANALYZE data_sources;
VACUUM ANALYZE categories;
EOF
```

## 📊 数据库查询示例

### 查看总数据量

```bash
PGPASSWORD=your_password psql -h localhost -U moreyudeals -d moreyudeals -c "
    SELECT COUNT(*) as total_deals FROM deals;
"
```

### 查看最新数据

```bash
PGPASSWORD=your_password psql -h localhost -U moreyudeals -d moreyudeals -c "
    SELECT id, title, merchant, created_at
    FROM deals
    ORDER BY created_at DESC
    LIMIT 10;
"
```

### 查看翻译进度

```bash
PGPASSWORD=your_password psql -h localhost -U moreyudeals -d moreyudeals -c "
    SELECT
        COUNT(*) as total,
        COUNT(title_zh) as translated_zh,
        COUNT(title_en) as translated_en,
        ROUND(COUNT(title_zh)::numeric / COUNT(*) * 100, 2) as zh_percent,
        ROUND(COUNT(title_en)::numeric / COUNT(*) * 100, 2) as en_percent
    FROM deals;
"
```

### 查看按日期统计

```bash
PGPASSWORD=your_password psql -h localhost -U moreyudeals -d moreyudeals -c "
    SELECT
        created_at::date as date,
        COUNT(*) as deals_count
    FROM deals
    GROUP BY created_at::date
    ORDER BY date DESC
    LIMIT 7;
"
```

## 🐛 故障排查

### 问题1: 脚本执行失败 - 找不到环境变量

**症状**: `DB_NAME` 或其他环境变量未定义

**解决方案**:
```bash
# 检查配置文件是否存在
ls -la packages/worker/.env.production

# 手动加载环境变量
export $(grep -v '^#' packages/worker/.env.production | xargs)

# 重新执行脚本
bash scripts/reset-and-fetch.sh
```

### 问题2: 数据库连接失败

**症状**: `FATAL: password authentication failed`

**解决方案**:
```bash
# 1. 检查数据库配置
cat packages/worker/.env.production | grep DB_

# 2. 测试数据库连接
PGPASSWORD=your_password psql -h localhost -U moreyudeals -d moreyudeals -c "SELECT 1;"

# 3. 如果密码错误,重新设置
sudo -u postgres psql -c "ALTER USER moreyudeals WITH PASSWORD 'new_password';"

# 4. 更新 .env.production 中的密码
nano packages/worker/.env.production
```

### 问题3: 抓取没有数据

**症状**: 抓取完成但数据库仍为空

**解决方案**:
```bash
# 1. 查看详细日志
pm2 logs moreyudeals-worker --lines 100

# 2. 手动运行抓取并查看输出
cd packages/worker
npx tsx src/index.ts

# 3. 检查数据源配置
PGPASSWORD=your_password psql -h localhost -U moreyudeals -d moreyudeals -c "
    SELECT * FROM data_sources;
"

# 4. 检查网络连接
curl -I https://www.sparhamster.at
```

### 问题4: Redis 缓存导致旧数据

**症状**: 清空数据库后翻译仍显示旧内容

**解决方案**:
```bash
# 清空 Redis 缓存
redis-cli FLUSHDB

# 或清空特定键
redis-cli KEYS "translation:*" | xargs redis-cli DEL
```

### 问题5: 权限不足

**症状**: `permission denied` 或 `must be owner of table`

**解决方案**:
```bash
# 使用 sudo 权限运行
sudo bash scripts/reset-and-fetch.sh

# 或重新授权
sudo -u postgres psql -d moreyudeals <<EOF
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO moreyudeals;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO moreyudeals;
EOF
```

## 📝 最佳实践

### 定期备份

建议每天自动备份数据库:

```bash
# 添加到 crontab
crontab -e

# 每天凌晨3点备份
0 3 * * * PGPASSWORD=your_password pg_dump -h localhost -U moreyudeals moreyudeals > /var/backups/moreyudeals/backup_$(date +\%Y\%m\%d).sql
```

### 监控数据增长

定期检查数据统计:

```bash
# 每周执行一次
bash scripts/db-stats.sh
```

### 清理旧数据

如果数据库增长过快,定期清理旧数据:

```bash
# 每月清理90天前的数据
0 2 1 * * PGPASSWORD=your_password psql -h localhost -U moreyudeals -d moreyudeals -c "DELETE FROM deals WHERE created_at < NOW() - INTERVAL '90 days';"
```

## 🔗 相关文档

- [服务器部署指南](./SERVER-DEPLOYMENT.md)
- [环境配置说明](../packages/worker/.env.production.example)
- [Worker 测试指南](../packages/worker/TESTING.md)

---

*最后更新: 2025-11-04*
