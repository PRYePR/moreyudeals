# 运维与监控指南 (OPERATIONS)

## 环境与组件

### 开发环境
- 操作系统：macOS / Linux
- 数据库：PostgreSQL 14+
- Node.js：18+ LTS
- 包管理：pnpm

### 生产环境
- 操作系统：腾讯云服务器（Ubuntu + 1Panel）
- 前端：Vercel (https://deals.moreyu.com)
- API服务器：Express + PM2 (https://dealsapi.moreyu.com)
- Worker服务：PM2 管理
- 数据库：PostgreSQL 15.5
- 网络：Cloudflare Tunnel

---

## 安全基线

### 网络安全
- **HTTPS**：Cloudflare Tunnel 自动加密
- **防火墙**：仅开放必要端口 (80/443/22)
- **API认证**：API Key认证
- **CORS**：仅允许 `https://deals.moreyu.com`

### 应用安全
- **环境变量**：敏感信息存储在 `.env` 文件，不提交到Git
- **数据库**：最小权限账户，限制IP访问
- **API Key轮换**：定期更换API密钥
- **外链属性**：统一 `rel="nofollow external sponsored"`

---

## PM2 进程管理

### 服务列表
```bash
# API服务器
pm2 start packages/api/ecosystem.config.js --env production

# Worker服务
pm2 start packages/worker/ecosystem.config.js --env production

# 查看状态
pm2 status

# 保存配置
pm2 save

# 设置开机自启
pm2 startup
```

### 常用命令
```bash
# 重启服务
pm2 restart moreyudeals-api
pm2 restart moreyudeals-worker

# 查看日志
pm2 logs moreyudeals-api
pm2 logs moreyudeals-worker

# 实时监控
pm2 monit

# 查看详细信息
pm2 show moreyudeals-api
```

---

## 数据库管理

### 备份策略
```bash
# 每日自动备份（建议配置 crontab）
0 3 * * * PGPASSWORD=your_password pg_dump -h 43.157.40.96 -p 5432 -U moreyudeals -d moreyudeals > /backup/moreyudeals_$(date +\%Y\%m\%d).sql

# 压缩备份
0 3 * * * PGPASSWORD=your_password pg_dump -h 43.157.40.96 -p 5432 -U moreyudeals -d moreyudeals | gzip > /backup/moreyudeals_$(date +\%Y\%m\%d).sql.gz
```

### 恢复数据
```bash
# 恢复备份
PGPASSWORD=your_password psql -h 43.157.40.96 -p 5432 -U moreyudeals -d moreyudeals < backup_20250120.sql

# 从压缩备份恢复
gunzip -c backup_20250120.sql.gz | PGPASSWORD=your_password psql -h 43.157.40.96 -p 5432 -U moreyudeals -d moreyudeals
```

### 定期清理
```bash
# 清理旧日志（保留30天）
find /backup -name "*.sql.gz" -mtime +30 -delete

# 清理PM2日志
pm2 flush
```

---

## 翻译服务监控

### 配额监控
- **实时跟踪**: 各Provider月度使用量和剩余配额
- **预警阈值**: 配额使用达到80%时发送预警
- **自动切换**: 主Provider配额不足时自动切换到备用Provider
- **成本统计**: 记录各Provider实际消费成本

### Provider健康检查
- **健康探测**: 定期检查各Provider API可用性
- **响应时间**: 监控翻译请求平均响应时间
- **成功率**: 统计各Provider翻译成功率
- **故障转移**: 连续失败3次自动降级，恢复后自动恢复

### 监控指标
```bash
# 查看Worker日志中的翻译统计
pm2 logs moreyudeals-worker | grep "Translation"

# 数据库查询翻译统计
SELECT
  COUNT(*) as total_deals,
  COUNT(title_zh) as translated_zh,
  COUNT(title_en) as translated_en
FROM deals;
```

---

## Worker 定时任务

### 配置说明
Worker使用内置的定时器，配置在 `.env` 文件中：

```env
FETCH_INTERVAL=30  # 抓取间隔（分钟）
FETCH_RANDOM_DELAY_MIN=0  # 随机延迟最小值（分钟）
FETCH_RANDOM_DELAY_MAX=5  # 随机延迟最大值（分钟）
```

### 手动触发
```bash
# 手动触发一次抓取
cd /www/wwwroot/Moreyudeals/packages/worker
node dist/index.js

# 或通过PM2重启
pm2 restart moreyudeals-worker
```

### 日志查看
```bash
# 查看Worker日志
pm2 logs moreyudeals-worker

# 查看最近100行
pm2 logs moreyudeals-worker --lines 100

# 实时跟踪
pm2 logs moreyudeals-worker -f

# 只看错误
pm2 logs moreyudeals-worker --err
```

---

## 告警策略

### 告警级别与条件

#### P0（立即响应）
- API服务器宕机
- 数据库连接完全失败
- Worker连续失败超过3次

#### P1（1小时内响应）
- 主要翻译Provider故障，已切换到备用
- 翻译配额即将耗尽（剩余<5%）
- 磁盘空间不足（<10%）

#### P2（12小时内响应）
- 部分RSS源抓取失败
- Provider响应时间异常（>10秒）
- Worker运行缓慢

### 告警渠道
- **邮件通知**: `support@moreyu.com`
- **日志文件**: `/www/wwwroot/Moreyudeals/logs/`
- **PM2监控**: `pm2 monit`

---

## 性能监控

### 系统资源监控
```bash
# 查看系统资源使用
pm2 monit

# 查看内存使用
free -h

# 查看磁盘使用
df -h

# 查看CPU使用
top
```

### 数据库监控
```bash
# 连接到数据库
PGPASSWORD=your_password psql -h 43.157.40.96 -p 5432 -U moreyudeals -d moreyudeals

# 查看数据库大小
SELECT pg_size_pretty(pg_database_size('moreyudeals'));

# 查看表大小
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# 查看活动连接
SELECT count(*) FROM pg_stat_activity;
```

### API性能监控
```bash
# 测试API响应时间
time curl https://dealsapi.moreyu.com/api/health

# 查看API日志
pm2 logs moreyudeals-api | grep "GET /api"
```

---

## 故障处理流程

### API服务器故障
1. 检查PM2状态：`pm2 status`
2. 查看错误日志：`pm2 logs moreyudeals-api --err`
3. 检查环境变量：`cat packages/api/.env`
4. 测试数据库连接
5. 重启服务：`pm2 restart moreyudeals-api`

### Worker服务故障
1. 检查PM2状态：`pm2 status`
2. 查看错误日志：`pm2 logs moreyudeals-worker --err`
3. 检查抓取源是否正常
4. 检查翻译API配额
5. 重启服务：`pm2 restart moreyudeals-worker`

### 数据库连接故障
1. 检查PostgreSQL状态：`sudo systemctl status postgresql`
2. 检查防火墙规则
3. 测试连接：`PGPASSWORD=your_password psql -h 43.157.40.96 -p 5432 -U moreyudeals -d moreyudeals -c "SELECT 1;"`
4. 重启PostgreSQL：`sudo systemctl restart postgresql`

### 翻译服务故障
1. 检查配额使用情况
2. 测试翻译API连接
3. 切换到备用Provider
4. 更新API密钥

---

## 日常运维任务

### 每日检查
- [ ] 检查服务状态：`pm2 status`
- [ ] 查看错误日志：`pm2 logs --err --lines 50`
- [ ] 检查磁盘空间：`df -h`
- [ ] 检查数据库连接数

### 每周检查
- [ ] 清理旧日志：`pm2 flush`
- [ ] 检查备份完整性
- [ ] 查看deals数量增长趋势
- [ ] 检查翻译质量

### 每月检查
- [ ] 更新依赖包
- [ ] 检查安全漏洞
- [ ] 分析翻译成本
- [ ] 评估系统性能
- [ ] 更新API密钥

---

## 运维小贴士

### 性能优化
- **数据库索引**: 确保常用查询字段有索引
- **API缓存**: 使用Redis缓存热门数据
- **CDN加速**: 前端静态资源使用CDN
- **图片优化**: 压缩和懒加载

### 成本优化
- **翻译配额**: 合理分配DeepL和Microsoft配额
- **服务器资源**: 根据实际负载调整配置
- **数据清理**: 定期清理过期数据

### 可靠性提升
- **健康检查**: 配置Cloudflare健康检查
- **自动重启**: PM2自动重启异常进程
- **多重备份**: 本地+云端双重备份
- **故障演练**: 定期进行故障恢复演练

---

## 相关文档

- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南
- [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) - 本地开发指南
