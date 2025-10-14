# 数据库权限分离 - 手动执行指南

## 状态

⚠️ **待执行** - 需要 postgres 超级用户密码

## 背景

当前系统使用 `moreyu_admin` 账号运行，该账号具有 `CREATEDB` 权限但没有 `CREATEROLE` 权限。为了实现最小权限原则，我们准备了权限分离方案，但需要 postgres 超级用户权限才能执行。

## 当前配置

所有服务（worker + web）均使用以下配置：
- **用户**: `moreyu_admin`
- **密码**: `bTXsPFtiLb7tNH87`
- **权限**: CREATEDB (可创建数据库)
- **状态**: ✅ 功能正常，所有测试通过

## 权限分离目标

创建两个专用账号：

### 1. worker_user (Worker 服务专用)
- **权限**: SELECT, INSERT, UPDATE on deals, data_sources, rss_items, translation_jobs
- **密码**: `WorkerP@ss2025!Secure`
- **用途**: Worker 服务读写数据

### 2. web_user (Web 应用专用)
- **权限**: SELECT on deals, data_sources, rss_items, categories, tags, merchants
- **密码**: `WebP@ss2025!ReadOnly`
- **用途**: Web 应用只读访问

## 执行步骤

### 前置条件

1. 获取 postgres 超级用户密码（从云服务商控制台或服务器管理员）
2. 确保可以连接到数据库服务器 `43.157.22.182:5432`

### 步骤 1: 执行权限分离脚本

```bash
# 使用 postgres 超级用户执行脚本 004
PGPASSWORD="<postgres_password>" psql \
  -h 43.157.22.182 \
  -U postgres \
  -d moreyudeals \
  -f packages/worker/migrations/004_create_permission_separated_users.sql
```

**预期输出**:
```
BEGIN
Created user: worker_user
...
Created user: web_user
...
✅ worker_user 权限配置完成
✅ web_user 权限配置完成
✅ 所有权限验证通过
COMMIT
```

### 步骤 2: 验证账号创建

```bash
# 检查账号是否创建成功
PGPASSWORD="<postgres_password>" psql \
  -h 43.157.22.182 \
  -U postgres \
  -d moreyudeals \
  -c "SELECT rolname, rolcanlogin FROM pg_roles WHERE rolname IN ('worker_user', 'web_user');"
```

**预期输出**:
```
   rolname   | rolcanlogin
-------------+-------------
 worker_user | t
 web_user    | t
(2 rows)
```

### 步骤 3: 更新 Worker 配置

编辑 `packages/worker/.env.local`:

```bash
# 修改以下行
DB_USER=worker_user
DB_PASSWORD=WorkerP@ss2025!Secure

# 保持其他配置不变
DB_HOST=43.157.22.182
DB_PORT=5432
DB_NAME=moreyudeals
DB_SSL=false
```

### 步骤 4: 更新 Web 配置

编辑 `packages/web/.env.local`:

```bash
# 修改以下行
DB_USER=web_user
DB_PASSWORD=WebP@ss2025!ReadOnly

# 保持其他配置不变
DB_HOST=43.157.22.182
DB_PORT=5432
DB_NAME=moreyudeals
DB_SSL=false
```

### 步骤 5: 验证新账号连接

```bash
# 测试 worker_user 连接和权限
PGPASSWORD="WorkerP@ss2025!Secure" psql \
  -h 43.157.22.182 \
  -U worker_user \
  -d moreyudeals \
  -c "SELECT COUNT(*) FROM deals;"

# 测试 web_user 连接（只读）
PGPASSWORD="WebP@ss2025!ReadOnly" psql \
  -h 43.157.22.182 \
  -U web_user \
  -d moreyudeals \
  -c "SELECT COUNT(*) FROM deals;"

# 验证 web_user 无法写入（应该失败）
PGPASSWORD="WebP@ss2025!ReadOnly" psql \
  -h 43.157.22.182 \
  -U web_user \
  -d moreyudeals \
  -c "INSERT INTO deals (id, guid) VALUES (gen_random_uuid(), 'test');"
  # 预期: ERROR: permission denied for table deals
```

### 步骤 6: 测试服务启动

```bash
# 停止所有后台 yarn dev 进程
pkill -f "yarn dev"

# 测试 Worker 服务
cd /Users/prye/Documents/Moreyudeals
yarn workspace @moreyudeals/worker dev

# 观察日志，确认：
# ✅ 数据库连接成功
# ✅ 可以抓取和写入 deals
# ✅ 翻译服务正常

# 在新终端测试 Web 服务
yarn workspace @moreyudeals/web dev

# 访问 http://localhost:3000/deals
# 确认可以正常显示数据
```

### 步骤 7: 运行测试验证

```bash
# Worker 测试（应该全部通过）
yarn workspace @moreyudeals/worker test

# Web API 测试
yarn workspace @moreyudeals/web test
```

## 回滚方案

如果遇到问题，可以快速回滚到使用 `moreyu_admin` 账号：

### 回滚步骤 1: 恢复配置文件

```bash
# packages/worker/.env.local
DB_USER=moreyu_admin
DB_PASSWORD=bTXsPFtiLb7tNH87

# packages/web/.env.local
DB_USER=moreyu_admin
DB_PASSWORD=bTXsPFtiLb7tNH87
```

### 回滚步骤 2: 重启服务

```bash
pkill -f "yarn dev"
yarn dev
```

### 回滚步骤 3: 删除创建的账号（可选）

```bash
PGPASSWORD="<postgres_password>" psql \
  -h 43.157.22.182 \
  -U postgres \
  -d moreyudeals \
  -c "DROP USER IF EXISTS worker_user; DROP USER IF EXISTS web_user;"
```

## 获取 postgres 密码的方法

### 方法 1: 云服务商控制台

**腾讯云 PostgreSQL**:
1. 登录腾讯云控制台 https://console.cloud.tencent.com/
2. 进入 PostgreSQL → 实例列表
3. 找到实例 `43.157.22.182`
4. 点击"账号管理"
5. 查看或重置 `postgres` 用户密码

**阿里云 RDS PostgreSQL**:
1. 登录阿里云控制台 https://rdsnext.console.aliyun.com/
2. 进入 RDS → PostgreSQL 实例
3. 点击实例 ID
4. 左侧菜单 → 账号管理
5. 重置 postgres 账号密码

**AWS RDS PostgreSQL**:
1. 登录 AWS Console
2. 进入 RDS → Databases
3. 选择实例
4. 点击 "Modify"
5. 设置新的 Master password

### 方法 2: 自建服务器

如果是自建 PostgreSQL：

```bash
# SSH 登录到服务器
ssh user@43.157.22.182

# 切换到 postgres 系统用户
sudo -u postgres psql

# 重置密码
ALTER USER postgres PASSWORD 'new_strong_password';

# 退出
\q
```

## 安全建议

1. **不要在代码仓库中提交密码** - .env.local 文件已在 .gitignore 中
2. **使用强密码** - 当前示例密码可以修改为更复杂的密码
3. **定期轮换密码** - 建议每 90 天更换一次数据库密码
4. **生产环境使用 SSL** - 设置 `DB_SSL=true` 并配置证书
5. **监控账号活动** - 启用 PostgreSQL 审计日志

## 注意事项

1. ⚠️ 在生产环境执行前，建议先在测试环境验证
2. ⚠️ 执行期间建议停止 worker 和 web 服务
3. ⚠️ 确保有数据库备份（当前已有 backups/ 目录）
4. ⚠️ worker_user 没有 DELETE 权限，防止误删数据
5. ⚠️ web_user 完全只读，无法修改任何数据

## 相关文件

- 迁移脚本: `packages/worker/migrations/004_create_permission_separated_users.sql`
- 文档: `docs/STEP3_DB_SCHEMA.md` 第 15 章
- Worker 配置: `packages/worker/.env.local`
- Web 配置: `packages/web/.env.local`

## 联系方式

如有问题，请查看：
- 项目文档: `docs/`
- 数据库迁移历史: `packages/worker/migrations/`
- 测试日志: `yarn workspace @moreyudeals/worker test`

---

**最后更新**: 2025-10-14
**状态**: 待执行（需要 postgres 密码）
**优先级**: 中（功能正常，建议在生产部署前完成）
