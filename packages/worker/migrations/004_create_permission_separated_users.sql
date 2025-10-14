-- ============================================
-- 迁移脚本 004: 创建权限分离的数据库账号
-- 作者: Claude
-- 日期: 2025-10-14
-- 目的: 创建 worker_user (读写) 和 web_user (只读) 账号
-- 依赖: 需要 CREATEROLE 权限或 SUPERUSER 账号执行
-- ============================================

BEGIN;

-- ============================================
-- 1. 创建 worker_user (Worker 服务专用账号)
-- ============================================

-- 创建用户 (如果已存在则跳过)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'worker_user') THEN
    CREATE USER worker_user WITH PASSWORD 'WorkerP@ss2025!Secure';
    RAISE NOTICE 'Created user: worker_user';
  ELSE
    RAISE NOTICE 'User worker_user already exists, skipping creation';
  END IF;
END $$;

-- 授予数据库连接权限
GRANT CONNECT ON DATABASE moreyudeals TO worker_user;

-- 授予 public schema 使用权限
GRANT USAGE ON SCHEMA public TO worker_user;

-- deals 表: SELECT, INSERT, UPDATE (不给 DELETE，防止误删)
GRANT SELECT, INSERT, UPDATE ON deals TO worker_user;

-- data_sources 表: SELECT, UPDATE (更新 last_fetched)
GRANT SELECT, UPDATE ON data_sources TO worker_user;

-- rss_items 表: SELECT, INSERT, UPDATE
GRANT SELECT, INSERT, UPDATE ON rss_items TO worker_user;

-- translation_jobs 表: SELECT, INSERT, UPDATE
GRANT SELECT, INSERT, UPDATE ON translation_jobs TO worker_user;

-- 授予序列权限 (自动生成 ID)
DO $$
BEGIN
  -- 检查 deals 是否使用序列
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals'
    AND column_name = 'id'
    AND column_default LIKE 'nextval%'
  ) THEN
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO worker_user;
  END IF;
END $$;

-- 授予未来创建的表的默认权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE ON TABLES TO worker_user;

RAISE NOTICE '✅ worker_user 权限配置完成';

-- ============================================
-- 2. 创建 web_user (Web 应用专用只读账号)
-- ============================================

-- 创建用户 (如果已存在则跳过)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'web_user') THEN
    CREATE USER web_user WITH PASSWORD 'WebP@ss2025!ReadOnly';
    RAISE NOTICE 'Created user: web_user';
  ELSE
    RAISE NOTICE 'User web_user already exists, skipping creation';
  END IF;
END $$;

-- 授予数据库连接权限
GRANT CONNECT ON DATABASE moreyudeals TO web_user;

-- 授予 public schema 使用权限
GRANT USAGE ON SCHEMA public TO web_user;

-- 核心表: 只读权限
GRANT SELECT ON deals TO web_user;
GRANT SELECT ON data_sources TO web_user;
GRANT SELECT ON rss_items TO web_user;

-- categories/tags/merchants 表 (如果存在)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categories') THEN
    GRANT SELECT ON categories TO web_user;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tags') THEN
    GRANT SELECT ON tags TO web_user;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'merchants') THEN
    GRANT SELECT ON merchants TO web_user;
  END IF;
END $$;

-- 授予未来创建的表的默认只读权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO web_user;

RAISE NOTICE '✅ web_user 权限配置完成';

-- ============================================
-- 3. 验证权限配置
-- ============================================

DO $$
DECLARE
  worker_can_select BOOLEAN;
  worker_can_insert BOOLEAN;
  web_can_select BOOLEAN;
  web_can_insert BOOLEAN;
BEGIN
  -- 验证 worker_user 权限
  SELECT
    has_table_privilege('worker_user', 'deals', 'SELECT') INTO worker_can_select;
  SELECT
    has_table_privilege('worker_user', 'deals', 'INSERT') INTO worker_can_insert;

  -- 验证 web_user 权限
  SELECT
    has_table_privilege('web_user', 'deals', 'SELECT') INTO web_can_select;
  SELECT
    has_table_privilege('web_user', 'deals', 'INSERT') INTO web_can_insert;

  -- 输出验证结果
  RAISE NOTICE '=== 权限验证结果 ===';
  RAISE NOTICE 'worker_user on deals: SELECT=%, INSERT=%', worker_can_select, worker_can_insert;
  RAISE NOTICE 'web_user on deals: SELECT=%, INSERT=%', web_can_select, web_can_insert;

  -- 检查是否符合预期
  IF NOT worker_can_select OR NOT worker_can_insert THEN
    RAISE WARNING 'worker_user 权限配置可能有问题';
  END IF;

  IF NOT web_can_select OR web_can_insert THEN
    RAISE WARNING 'web_user 权限配置可能有问题（应该只读）';
  END IF;

  IF worker_can_select AND worker_can_insert AND web_can_select AND NOT web_can_insert THEN
    RAISE NOTICE '✅ 所有权限验证通过';
  END IF;
END $$;

-- ============================================
-- 4. 显示创建结果
-- ============================================

SELECT
  'Permission separation completed' AS status,
  (SELECT COUNT(*) FROM pg_roles WHERE rolname IN ('worker_user', 'web_user')) AS created_users,
  'worker_user: read/write on deals, data_sources' AS worker_permissions,
  'web_user: read-only on all tables' AS web_permissions;

COMMIT;

-- ============================================
-- 使用说明
-- ============================================
--
-- 执行此脚本需要超级用户或具有 CREATEROLE 权限的账号:
--   PGPASSWORD="<superuser_password>" psql -h <host> -U postgres -d moreyudeals \
--     -f packages/worker/migrations/004_create_permission_separated_users.sql
--
-- 执行后需要更新环境变量:
--
-- 1. packages/worker/.env.local:
--    DB_USER=worker_user
--    DB_PASSWORD=WorkerP@ss2025!Secure
--
-- 2. packages/web/.env.local:
--    DB_USER=web_user
--    DB_PASSWORD=WebP@ss2025!ReadOnly
--
-- 验证连接:
--   PGPASSWORD="WorkerP@ss2025!Secure" psql -h <host> -U worker_user -d moreyudeals -c "SELECT COUNT(*) FROM deals;"
--   PGPASSWORD="WebP@ss2025!ReadOnly" psql -h <host> -U web_user -d moreyudeals -c "SELECT COUNT(*) FROM deals;"
--
-- 回滚 (如需删除账号):
--   DROP USER IF EXISTS worker_user;
--   DROP USER IF EXISTS web_user;
-- ============================================
