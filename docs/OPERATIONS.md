# 运维与部署规范 (OPERATIONS)

## 环境与组件
- 操作系统：腾讯云轻量应用服务器（Linux）
- 管理：宝塔面板（Node.js LTS、Nginx、PostgreSQL、PM2）
- 前端：Vercel（Next.js）
- 后端：Strapi（自托管）
- 存储：COS（S3 兼容）
- 统计：Umami（自托管，独立数据库）

## 安全基线
- HTTPS：Nginx + Let’s Encrypt（宝塔一键）
- 防火墙：仅开放 80/443/22
- Strapi Admin 路径改为 `/control`；可选 IP 白名单/人机验证
- CORS：仅允许 `https://deals.moreyu.com`（及 staging 域名）
- Token 分离：前端只读 Token；抓取脚本写 Token；分别存放到不同 `.env`
- 外链属性：统一 `rel="nofollow external sponsored"`

## Strapi 媒体上传（COS 必配）
- 使用 `@strapi/provider-upload-aws-s3`（S3 兼容）
- 关键环境变量示例（`.env`）：
```
AWS_ACCESS_KEY_ID=你的SecretId
AWS_ACCESS_SECRET=你的SecretKey
AWS_REGION=ap-xxx
AWS_BUCKET=your-cos-bucket
AWS_S3_ENDPOINT=https://cos.ap-xxx.myqcloud.com
AWS_S3_FORCE_PATH_STYLE=true
```

## 数据库
- PostgreSQL 建两个独立数据库：`strapi_db`、`umami_db`
- 创建最小权限账户（应用用），迁移/初始化时使用管理员账户

## 定时任务（抓取/翻译/入库）
- 使用 PM2 cron（推荐）或系统 crontab
- PM2 示例：
```
pm2 start rss-worker.js --name deals-rss --cron "*/15 * * * *" --time
pm2 save
pm2 startup
```
- 日志查看：
```
pm2 logs deals-rss
```
- 失败重试：脚本内采用指数退避，最多 3 次；失败写入 `Job`/日志并邮件告警

## 备份与恢复
- PostgreSQL 每日自动备份：本地 + COS 异地，保留 30 天
- 备份样例（crontab）：
```
0 3 * * * pg_dump -U postgres strapi_db | gzip > /data/backups/strapi_$(date +\%F).sql.gz && coscmd upload /data/backups/strapi_$(date +\%F).sql.gz cos://your-bucket/backups/
```
- 恢复演练：每月至少一次（验证备份有效性）

## 翻译服务监控

### **配额监控**
- **实时跟踪**: 各Provider月度使用量和剩余配额
- **预警阈值**: 配额使用达到80%时发送预警
- **自动切换**: 主Provider配额不足时自动切换到备用Provider
- **成本统计**: 记录各Provider实际消费成本

### **Provider健康检查**
- **健康探测**: 每15分钟检查各Provider API可用性
- **响应时间**: 监控翻译请求平均响应时间
- **成功率**: 统计各Provider翻译成功率
- **故障转移**: 连续失败3次自动降级，恢复后自动恢复

### **缓存性能监控**
- **缓存命中率**: Redis缓存命中率监控
- **缓存容量**: Redis内存使用量监控
- **缓存穿透**: 监控缓存未命中的请求量
- **过期策略**: 自动清理过期缓存数据

## 告警策略

### **告警级别与条件**
- **P0（立即响应）**：
  - 所有翻译Provider全部不可用
  - Redis完全宕机且无法降级
  - 数据库连接完全失败
- **P1（1小时内响应）**：
  - 主要Provider（DeepL）故障，已切换到备用
  - 翻译配额即将耗尽（剩余<5%）
  - 缓存命中率异常降低（<50%）
- **P2（12小时内响应）**：
  - 部分RSS源抓取失败
  - Provider响应时间异常（>10秒）
  - 翻译质量评分下降

### **告警渠道配置**
- **邮件通知**: `support@moreyu.com`
- **主题格式**: `[Deals Alert P0/P1/P2] - {告警类型}`
- **内容包含**: Provider状态、配额使用情况、建议处理方案
- **频率控制**: 相同问题30分钟内不重复告警

## 翻译服务运维

### **日常运维任务**
- **配额检查**: 每日检查各Provider配额使用情况
- **缓存清理**: 每周清理过期Redis缓存数据
- **质量抽查**: 每周抽查翻译质量，对比不同Provider效果
- **成本分析**: 每月分析翻译成本，优化Provider使用策略

### **故障处理流程**
1. **Provider故障**: 检查错误日志→手动切换Provider→通知相关团队
2. **配额耗尽**: 立即切换到备用Provider→评估是否需要升级套餐
3. **缓存故障**: 切换到无缓存模式→修复Redis连接→恢复缓存服务
4. **质量异常**: 暂停自动翻译→人工审核→调整Provider优先级

### **性能优化建议**
- **缓存预热**: 对热门内容提前进行翻译缓存
- **批量翻译**: 合并多个短文本减少API调用次数
- **文本预处理**: 移除不必要的HTML标签和空白字符
- **智能分段**: 按语义边界分割长文本，提高翻译质量

## 运维小贴士
- Strapi Webhook 触发 Next.js `/api/revalidate`，确保 ISR 新内容及时生效
- 图片策略：MVP 阶段建议外链；若缓存则走 COS + 压缩
- 定期清理：旧日志、无用媒体、失败任务
- **翻译监控面板**: 建议使用Grafana展示翻译服务各项指标
- **Provider轮换**: 定期轮换API Key，避免单Key过度使用
