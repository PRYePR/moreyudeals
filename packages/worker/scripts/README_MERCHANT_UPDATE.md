# 商家规范化数据库更新脚本使用说明

## 文件位置

**商家配置文件** (手动修改这个):
- `/packages/worker/src/config/merchant-mapping.ts`
- `/packages/web/src/lib/config/merchant-mapping.ts`

**数据库更新脚本**:
- `/packages/worker/scripts/update-canonical-merchants.sql`

---

## 使用场景

当你需要更新现有数据库中的商家规范化字段时使用此脚本,例如:

1. ✅ 合并重复商家 (如: Amazon.at + Amazon.de → Amazon.de)
2. ✅ 修正商家名称拼写
3. ✅ 添加新的商家映射规则
4. ✅ 批量规范化历史数据

---

## 使用步骤

### 1. 修改商家配置 (可选)

如果需要添加新商家或修改映射规则,编辑:
```
/packages/worker/src/config/merchant-mapping.ts
```

### 2. 备份数据库 (重要!)

```bash
# 生产环境必须先备份!
pg_dump "postgresql://用户名:密码@主机/数据库?sslmode=require" > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 3. 执行更新脚本

#### 方法A: 直接执行 (推荐)

```bash
psql "postgresql://用户名:密码@主机/数据库?sslmode=require" \
  -f /path/to/update-canonical-merchants.sql
```

#### 方法B: 使用环境变量

```bash
# 设置数据库连接
export DATABASE_URL="postgresql://用户名:密码@主机/数据库?sslmode=require"

# 执行脚本
psql "$DATABASE_URL" -f update-canonical-merchants.sql
```

### 4. 验证结果

脚本执行后会自动显示统计信息:
- ✅ 总记录数
- ✅ 已规范化记录数
- ✅ 商家分布统计 (Top 30)

---

## 生产环境使用

### 完整流程

```bash
# 1. 连接到生产服务器
ssh user@production-server

# 2. 进入项目目录
cd /path/to/Moreyudeals/packages/worker/scripts

# 3. 备份数据库
pg_dump "postgresql://moreyudeals_owner:密码@主机/moreyudeals?sslmode=require" \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# 4. 执行更新脚本
psql "postgresql://moreyudeals_owner:密码@主机/moreyudeals?sslmode=require" \
  -f update-canonical-merchants.sql

# 5. 检查结果
# 脚本会自动显示统计信息
```

### 示例 (使用实际数据库连接)

```bash
# 开发/测试环境
psql "postgresql://moreyudeals_owner:1jzxko42BJqXYwm9suOfzqBY@ep-dark-firefly-a2kwftxx.eu-central-1.aws.neon.tech/moreyudeals?sslmode=require" \
  -f update-canonical-merchants.sql

# 生产环境 (请替换为实际生产数据库地址)
psql "postgresql://生产用户:生产密码@生产主机/moreyudeals?sslmode=require" \
  -f update-canonical-merchants.sql
```

---

## 脚本功能说明

### 1. 更新已知商家

脚本会根据配置更新以下商家:

- **Amazon系列**: 所有Amazon变体 → `Amazon.de`
- **常见商家**: MediaMarkt, Saturn, IKEA, Zalando等
- **新增商家**: getgoods, Ninja Kitchen, ABOUT YOU等 (2025-11-12新增)

### 2. 自动处理未知商家

对于脚本中未明确配置的商家:
- 自动生成 `canonical_merchant_id` (小写,空格转连字符)
- 保持原始商家名作为 `canonical_merchant_name`

### 3. 安全机制

- ✅ 使用事务 (BEGIN...COMMIT)
- ✅ 出错自动回滚
- ✅ 不会修改原始 `merchant` 字段
- ✅ 只更新 `canonical_merchant_id` 和 `canonical_merchant_name`

---

## 常见问题

### Q1: 脚本会覆盖已有的规范化数据吗?

**A:** 会的。脚本会更新所有匹配的记录,即使它们已经有 `canonical_merchant_name`。这样可以确保最新的映射规则生效。

### Q2: 如何只更新特定商家?

**A:** 从脚本中删除不需要的UPDATE语句,只保留需要更新的商家部分。

### Q3: 脚本执行需要多久?

**A:** 取决于数据量:
- 1000条记录: ~1秒
- 10000条记录: ~5秒
- 100000条记录: ~30秒

### Q4: 执行失败怎么办?

**A:** 脚本使用事务,失败会自动回滚。如果需要恢复备份:

```bash
psql "数据库连接字符串" < backup_文件名.sql
```

---

## 维护建议

1. **定期更新**: 每次修改 `merchant-mapping.ts` 后,在生产环境执行此脚本
2. **版本控制**: 脚本文件纳入Git,记录每次修改
3. **备份策略**: 生产环境执行前务必备份
4. **监控验证**: 执行后检查前端商家筛选器是否正确显示

---

## 脚本更新记录

- **v2.0** (2025-11-12):
  - 合并Amazon系列为统一的 Amazon.de
  - 新增15个商家映射
  - 优化Yves Rocher合并逻辑
  - 改进统计输出格式

- **v1.0** (2025-11-02):
  - 初始版本
  - 支持基础商家规范化
