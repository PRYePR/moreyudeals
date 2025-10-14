-- ============================================
-- 迁移脚本 003: rss_feeds → data_sources
-- 作者: Claude
-- 日期: 2025-10-14
-- 目的: 将 RSS 专用表重命名为通用数据源表，支持多种数据源类型
-- 依赖: 001_create_tables.sql, 002_create_deals_table.sql
-- ============================================

BEGIN;

-- ============================================
-- 1. 表重命名
-- ============================================

-- 重命名主表
ALTER TABLE rss_feeds RENAME TO data_sources;

-- ============================================
-- 2. 字段重命名
-- ============================================

-- 将 url 字段重命名为 rss_url (更明确的语义)
ALTER TABLE data_sources RENAME COLUMN url TO rss_url;

-- ============================================
-- 3. 新增扩展字段
-- ============================================

-- 数据源类型 (rss/api/scraper)
ALTER TABLE data_sources
ADD COLUMN source_type VARCHAR(20) DEFAULT 'rss' NOT NULL;

-- API 端点地址 (用于 API 类型数据源)
ALTER TABLE data_sources
ADD COLUMN api_url TEXT;

-- API 配置 (headers, params, auth 等)
ALTER TABLE data_sources
ADD COLUMN api_config JSONB DEFAULT '{}'::jsonb;

-- 抓取间隔 (分钟)
ALTER TABLE data_sources
ADD COLUMN fetch_interval INTEGER DEFAULT 30 NOT NULL;

-- 优先级 (数字越大越优先)
ALTER TABLE data_sources
ADD COLUMN priority INTEGER DEFAULT 0 NOT NULL;

-- ============================================
-- 4. 添加约束
-- ============================================

-- 限制 source_type 枚举值
ALTER TABLE data_sources
ADD CONSTRAINT data_sources_source_type_check
  CHECK (source_type IN ('rss', 'api', 'scraper'));

-- 确保 RSS 类型数据源必须有 rss_url
ALTER TABLE data_sources
ADD CONSTRAINT data_sources_rss_url_check
  CHECK (source_type != 'rss' OR rss_url IS NOT NULL);

-- 确保 API 类型数据源必须有 api_url
ALTER TABLE data_sources
ADD CONSTRAINT data_sources_api_url_check
  CHECK (source_type != 'api' OR api_url IS NOT NULL);

-- ============================================
-- 5. 更新现有数据
-- ============================================

-- 将所有现有记录标记为 RSS 类型
UPDATE data_sources
SET source_type = 'rss'
WHERE rss_url IS NOT NULL;

-- ============================================
-- 6. 重命名索引
-- ============================================

-- 重命名主键索引
ALTER INDEX IF EXISTS rss_feeds_pkey
RENAME TO data_sources_pkey;

-- 重命名 enabled 索引
ALTER INDEX IF EXISTS idx_rss_feeds_enabled
RENAME TO idx_data_sources_enabled;

-- 重命名 url 唯一索引 (如果存在)
ALTER INDEX IF EXISTS rss_feeds_url_key
RENAME TO data_sources_rss_url_key;

-- ============================================
-- 7. 创建新索引
-- ============================================

-- 数据源类型索引 (用于按类型筛选)
CREATE INDEX idx_data_sources_source_type
ON data_sources(source_type);

-- 优先级索引 (用于优先级排序，只索引启用的数据源)
CREATE INDEX idx_data_sources_priority
ON data_sources(priority DESC)
WHERE enabled = true;

-- 组合索引：类型 + 启用状态 (常用查询)
CREATE INDEX idx_data_sources_type_enabled
ON data_sources(source_type, enabled);

-- ============================================
-- 8. 更新外键约束
-- ============================================

-- 注意: 如果 deals 表的 feed_id 外键已经存在，需要先删除再重建
-- 检查并更新 deals 表的外键引用

DO $$
BEGIN
  -- 删除旧的外键约束 (如果存在)
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname IN ('rss_items_feed_id_fkey', 'deals_feed_id_fkey')
  ) THEN
    ALTER TABLE deals DROP CONSTRAINT IF EXISTS rss_items_feed_id_fkey;
    ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_feed_id_fkey;

    -- 重新创建外键，指向新表名
    ALTER TABLE deals
    ADD CONSTRAINT deals_feed_id_fkey
      FOREIGN KEY (feed_id)
      REFERENCES data_sources(id)
      ON DELETE SET NULL;

    RAISE NOTICE 'Foreign key constraint updated successfully';
  ELSE
    RAISE NOTICE 'No existing foreign key found, skipping update';
  END IF;
END $$;

-- ============================================
-- 9. 更新触发器 (如果存在)
-- ============================================

-- 检查并重建 updated_at 触发器
DROP TRIGGER IF EXISTS update_rss_feeds_updated_at ON data_sources;

-- 创建新的 updated_at 触发器
CREATE TRIGGER update_data_sources_updated_at
  BEFORE UPDATE ON data_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. 验证迁移
-- ============================================

DO $$
DECLARE
  record_count INT;
  rss_count INT;
  enabled_count INT;
BEGIN
  -- 检查记录数
  SELECT COUNT(*) INTO record_count FROM data_sources;
  RAISE NOTICE 'Total data sources: %', record_count;

  -- 检查 RSS 类型数据源数量
  SELECT COUNT(*) INTO rss_count
  FROM data_sources
  WHERE source_type = 'rss';
  RAISE NOTICE 'RSS data sources: %', rss_count;

  -- 检查启用的数据源数量
  SELECT COUNT(*) INTO enabled_count
  FROM data_sources
  WHERE enabled = true;
  RAISE NOTICE 'Enabled data sources: %', enabled_count;

  -- 验证所有 RSS 类型数据源都有 rss_url
  IF EXISTS (
    SELECT 1 FROM data_sources
    WHERE source_type = 'rss' AND rss_url IS NULL
  ) THEN
    RAISE EXCEPTION 'Migration validation failed: RSS data sources without rss_url found';
  END IF;

  RAISE NOTICE 'Migration validation passed successfully';
END $$;

-- ============================================
-- 11. 显示迁移结果
-- ============================================

SELECT
  'Migration 003 completed successfully' AS status,
  COUNT(*) AS total_data_sources,
  COUNT(*) FILTER (WHERE source_type = 'rss') AS rss_sources,
  COUNT(*) FILTER (WHERE source_type = 'api') AS api_sources,
  COUNT(*) FILTER (WHERE source_type = 'scraper') AS scraper_sources,
  COUNT(*) FILTER (WHERE enabled = true) AS enabled_sources
FROM data_sources;

COMMIT;

-- ============================================
-- 迁移完成提示
-- ============================================
--
-- 下一步操作:
-- 1. 更新 DatabaseManager 代码:
--    - getRSSFeeds() → getDataSources()
--    - SQL 查询中的 rss_feeds → data_sources
--    - SQL 查询中的 url → rss_url
--
-- 2. 更新测试用例:
--    - 测试文件中的表名引用
--    - Mock 数据中的字段名
--
-- 3. 验证功能:
--    - 运行 Worker 测试: yarn workspace @moreyudeals/worker test
--    - 运行 Web 测试: yarn workspace @moreyudeals/web test
--    - 启动 Worker 服务验证: yarn workspace @moreyudeals/worker dev
--
-- 4. 如需回滚，执行: 003_rollback.sql
-- ============================================
