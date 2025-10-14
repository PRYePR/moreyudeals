# Worker 主程序手动测试指南

## T10: 主程序集成联调

本文档提供完整的手动测试步骤，用于验证 Worker 主程序的集成情况。

---

## 前置条件

1. **环境变量配置** - 确保 `.env` 文件包含所有必需配置：
   ```bash
   # 数据库
   DB_HOST=your-db-host
   DB_PORT=5432
   DB_NAME=moreyudeals_dev
   DB_USER=your-username
   DB_PASSWORD=your-password

   # Sparhamster 抓取配置
   SPARHAMSTER_MIN_INTERVAL_SECONDS=300  # 5分钟
   SPARHAMSTER_MAX_INTERVAL_SECONDS=900  # 15分钟

   # 翻译服务（可选）
   TRANSLATION_ENABLED=true
   DEEPL_API_KEY=your-api-key
   REDIS_URL=redis://localhost:6379

   # Worker 配置
   WORKER_MAX_RETRIES=3
   ```

2. **数据库准备** - 确保数据库 schema 已更新：
   ```bash
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\d deals"
   ```

3. **依赖安装**：
   ```bash
   cd packages/worker
   npm install
   npm run build  # 验证编译通过
   ```

---

## 测试方式

### 方式 1: 自动化 E2E 测试脚本（推荐）

运行完整的端到端测试脚本：

```bash
cd packages/worker
npx tsx scripts/test-e2e.ts
```

**测试内容**:
- ✅ 环境变量验证
- ✅ 数据库连接
- ✅ 完整抓取流程（API → 标准化 → 去重 → 入库）
- ✅ 翻译流程（如启用）
- ✅ 数据完整性验证

**预期输出**:
```
🧪 ==============================================
🧪 End-to-End 测试开始
🧪 ==============================================

📋 Step 1: 环境变量验证
──────────────────────────────────────────────────
✅ 环境变量验证通过
   数据库: localhost:5432/moreyudeals_dev
   翻译服务: 启用 (deepl)
   抓取间隔: 300-900秒

📋 Step 2: 数据库连接测试
──────────────────────────────────────────────────
✅ 数据库连接成功
   当前 deals 表记录数: 42

📋 Step 3: 抓取流程测试 (API → 标准化 → 去重 → 入库)
──────────────────────────────────────────────────
🔄 开始抓取 Sparhamster 数据...
✅ 抓取流程完成
   获取记录: 20
   新增条目: 5
   更新条目: 0
   重复条目: 15
   错误数量: 0

   🔍 数据质量检查:
     商家信息提取率: 85% (17/20)
     价格信息提取率: 90% (18/20)
     Content Hash 生成率: 100% (20/20)

📋 Step 4: 翻译流程测试
──────────────────────────────────────────────────
🔄 开始处理翻译任务...
✅ 翻译流程完成
   处理数量: 5
   成功翻译: 5
   失败数量: 0

📋 Step 5: 数据完整性验证
──────────────────────────────────────────────────
✅ 数据完整性验证通过

   📊 数据统计:
     sparhamster:
       总记录数: 47
       已翻译: 42 (89%)
       最早记录: 2025-10-01 10:30:15
       最新记录: 2025-10-13 14:25:42

   ✅ 无重复记录

🎉 所有测试通过！系统运行正常。
```

---

### 方式 2: 手动运行主程序

启动 Worker 主程序并观察运行情况：

```bash
cd packages/worker
npm run dev
```

#### 步骤 1: 观察启动日志

**预期输出**:
```
🔍 验证环境变量配置...
✅ 环境变量验证通过
🚀 启动API抓取与翻译Worker服务
🔌 连接数据库: moreyudeals_dev
✅ 数据库连接成功
🌐 启动翻译Worker (RSS items)
🌐 启动翻译Adapter (Deals)
🔄 开始通过官方API抓取最新优惠
📊 API抓取任务完成:
  - 获取记录: 20
  - 新增条目: 3
  - 更新条目: 0
  - 重复条目: 17
  - 错误数量: 0
  - 耗时: 2145ms
✅ Worker服务启动完成
```

**验证点**:
- ✅ 环境变量验证通过
- ✅ 数据库连接成功
- ✅ 翻译服务启动（如启用）
- ✅ 立即执行一次抓取
- ✅ 无启动错误

#### 步骤 2: 观察定时抓取

**等待 5-15 分钟**（取决于配置的随机间隔），观察定时抓取日志：

```
⏰ [Sparhamster API 抓取] 下次执行: 8.5 分钟后
🔄 开始通过官方API抓取最新优惠
📊 API抓取任务完成:
  - 获取记录: 20
  - 新增条目: 2
  - 更新条目: 0
  - 重复条目: 18
  - 错误数量: 0
  - 耗时: 1987ms
```

**验证点**:
- ✅ RandomScheduler 按随机间隔执行
- ✅ 每次抓取成功完成
- ✅ 去重机制正常工作（重复条目数逐渐增加）

#### 步骤 3: 观察翻译任务（如启用）

**等待翻译任务执行**（根据配置的间隔）：

```
⏰ [Deal 翻译] 下次执行: 12.3 分钟后
🔄 开始处理待翻译 Deals...
📊 翻译任务完成: 处理 5, 成功 5, 失败 0
```

**验证点**:
- ✅ 翻译任务按计划执行
- ✅ 成功翻译新增的 Deal
- ✅ 无翻译错误

#### 步骤 4: 测试优雅关闭

按下 `Ctrl+C` 停止程序：

```
^C
🛑 收到SIGINT信号，开始优雅关闭...
🔌 数据库连接已关闭
✅ Worker服务已关闭
```

**验证点**:
- ✅ 捕获 SIGINT 信号
- ✅ 停止所有调度器
- ✅ 关闭数据库连接
- ✅ 进程正常退出

---

### 方式 3: 数据库验证

直接查询数据库验证数据正确性：

```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME
```

#### 验证 1: 检查新记录

```sql
-- 查看最近插入的记录
SELECT
  id,
  title,
  merchant,
  price,
  currency,
  is_translated,
  created_at
FROM deals
WHERE source_site = 'sparhamster'
ORDER BY created_at DESC
LIMIT 10;
```

**预期结果**:
- ✅ 有新记录（created_at 为最近时间）
- ✅ title、merchant、price 等字段已填充
- ✅ currency 为 'EUR'

#### 验证 2: 检查去重机制

```sql
-- 查看重复计数
SELECT
  title,
  duplicate_count,
  first_seen_at,
  last_seen_at
FROM deals
WHERE source_site = 'sparhamster'
  AND duplicate_count > 0
ORDER BY duplicate_count DESC
LIMIT 10;
```

**预期结果**:
- ✅ duplicate_count > 0 的记录存在
- ✅ last_seen_at 比 first_seen_at 晚
- ✅ 同一 Deal 被多次抓取时计数增加

#### 验证 3: 检查翻译状态

```sql
-- 查看翻译统计
SELECT
  translation_status,
  is_translated,
  COUNT(*) as count
FROM deals
WHERE source_site = 'sparhamster'
GROUP BY translation_status, is_translated;
```

**预期结果**:
- ✅ 有 'completed' 状态的记录（如翻译启用）
- ✅ is_translated = true 的记录存在
- ✅ 'pending' 状态的记录会逐渐减少

#### 验证 4: 检查 content_hash

```sql
-- 验证 content_hash 生成
SELECT
  id,
  title,
  content_hash,
  created_at
FROM deals
WHERE source_site = 'sparhamster'
  AND content_hash IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

**预期结果**:
- ✅ content_hash 为 16 位十六进制字符串
- ✅ 所有（或大部分）记录都有 content_hash
- ✅ 不同 Deal 的 hash 不同

#### 验证 5: 检查数据完整性

```sql
-- 检查是否有重复 GUID（不应该有）
SELECT guid, COUNT(*) as count
FROM deals
GROUP BY guid
HAVING COUNT(*) > 1;
```

**预期结果**:
- ✅ 结果为空（无重复 GUID）
- ✅ 唯一约束正常工作

---

## 常见问题排查

### Q1: 程序启动失败

**错误**: `❌ 环境变量验证失败: DB_HOST is required`

**解决**:
```bash
# 检查 .env 文件
cat packages/worker/.env

# 确保所有必需变量已设置
cp packages/worker/.env.example packages/worker/.env
# 编辑 .env 填写实际值
```

---

### Q2: 数据库连接失败

**错误**: `❌ 数据库连接失败: connect ECONNREFUSED`

**解决**:
```bash
# 检查数据库是否运行
pg_isready -h $DB_HOST -p $DB_PORT

# 验证凭证
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1"

# 检查防火墙规则（云数据库）
```

---

### Q3: API 抓取失败

**错误**: `❌ API抓取任务失败: Request failed with status code 429`

**原因**: 请求过于频繁被限流

**解决**:
```bash
# 增加抓取间隔
# .env:
SPARHAMSTER_MIN_INTERVAL_SECONDS=600  # 10分钟
SPARHAMSTER_MAX_INTERVAL_SECONDS=1800 # 30分钟
```

---

### Q4: 翻译失败

**错误**: `❌ 翻译任务失败: Authentication failed`

**解决**:
```bash
# 检查 DeepL API key
echo $DEEPL_API_KEY

# 验证 API key 有效性
curl -X POST 'https://api-free.deepl.com/v2/translate' \
  -H "Authorization: DeepL-Auth-Key $DEEPL_API_KEY" \
  -d 'text=Hello' \
  -d 'target_lang=ZH'

# 临时禁用翻译
# .env:
TRANSLATION_ENABLED=false
```

---

### Q5: 大量重复记录

**现象**: `重复条目: 20/20`（所有记录都重复）

**原因**: 正常现象，说明去重机制正常工作

**验证**:
```sql
-- 查看 duplicate_count 是否增长
SELECT
  AVG(duplicate_count) as avg_duplicates,
  MAX(duplicate_count) as max_duplicates
FROM deals
WHERE source_site = 'sparhamster';
```

---

## 性能基准

正常运行时的性能指标参考：

| 指标 | 预期值 | 说明 |
|------|--------|------|
| API 抓取耗时 | 1-3 秒 | 抓取 20 条记录 |
| 单条翻译耗时 | 0.5-1 秒 | DeepL API |
| 批量翻译（10条） | 5-10 秒 | 包含网络延迟 |
| 数据库插入 | <100ms | 单条记录 |
| 内存占用 | <200MB | 稳定运行时 |
| CPU 占用 | <5% | 空闲时 |

---

## 成功标准

完成以下所有验证点即可认为 T10 通过：

- [x] **环境变量验证** - 所有必需配置项存在且格式正确
- [x] **数据库连接** - 成功连接并执行查询
- [x] **API 抓取** - 成功抓取数据，fetched > 0
- [x] **数据标准化** - 商家、价格、hash 等字段正确提取
- [x] **去重机制** - 重复记录被正确识别，duplicate_count 增加
- [x] **数据入库** - 新记录成功插入 deals 表
- [x] **翻译流程** - 待翻译记录被处理（如启用）
- [x] **随机调度** - 抓取和翻译任务按随机间隔执行
- [x] **优雅关闭** - SIGINT/SIGTERM 被正确处理，资源清理完整
- [x] **数据完整性** - 无重复 GUID，字段格式正确

---

## 后续步骤

T10 完成后，准备生产部署：

1. **性能测试** - 长时间运行（24小时）监控内存和 CPU
2. **错误恢复测试** - 模拟网络故障、数据库断开等场景
3. **日志审查** - 确保日志级别和格式适合生产环境
4. **监控配置** - 设置 Prometheus/Grafana 监控指标
5. **告警规则** - 配置抓取失败、翻译失败等告警

---

## 报告模板

完成测试后，使用以下模板记录结果：

```markdown
# T10 主程序集成测试报告

**测试时间**: 2025-10-13 14:30
**测试人**: Your Name
**环境**: Development / Staging

## 测试结果

- [x] 环境变量验证通过
- [x] 数据库连接成功
- [x] API 抓取正常（20条/次）
- [x] 去重机制正常（17/20 重复）
- [x] 数据质量良好（商家 85%, 价格 90%）
- [x] 翻译流程正常（5条/批次）
- [x] 随机调度工作（5-15分钟间隔）
- [x] 优雅关闭正常

## 观察到的问题

1. **问题描述**: API 偶尔返回 429
   **影响**: 轻微，会自动重试
   **解决方案**: 已增加间隔至 10-30 分钟

2. **问题描述**: 部分商家 Logo 未提取
   **影响**: 中等，影响显示效果
   **解决方案**: 待优化 Logo 提取逻辑

## 性能数据

- API 抓取: 平均 2.1 秒
- 翻译: 平均 8.5 秒 (10条)
- 内存: 稳定在 150MB
- CPU: 空闲时 2-3%

## 建议

1. 考虑将抓取间隔增加至 30-60 分钟避免被限流
2. 添加商家 Logo 提取的备用策略
3. 增加更详细的错误日志

## 结论

✅ **T10 测试通过，系统可以进入生产部署阶段。**
```
