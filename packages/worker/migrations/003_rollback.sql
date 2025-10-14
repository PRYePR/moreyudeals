-- ============================================
-- 回滚脚本 003: data_sources → rss_feeds
-- 作者: Claude
-- 日期: 2025-10-14
-- 目的: 回滚 003 号迁移，将 data_sources 表恢复为 rss_feeds
-- 警告: 会丢失新增的 API/Scraper 类型数据源!
-- ============================================

BEGIN;

-- ============================================
-- 1. 警告: 检查是否有非 RSS 类型的数据源
-- ============================================

DO $$
DECLARE
  non_rss_count INT;
BEGIN
  SELECT COUNT(*) INTO non_rss_count
  FROM data_sources
  WHERE source_type != 'rss';

  IF non_rss_count > 0 THEN
    RAISE WARNING 'Found % non-RSS data sources. These will be lost after rollback!', non_rss_count;
    RAISE WARNING 'Consider exporting these records before continuing.';

    -- 导出非 RSS 数据源 (可选，需要文件系统写权限)
    -- COPY (
    --   SELECT * FROM data_sources WHERE source_type != 'rss'
    -- ) TO '/tmp/non_rss_data_sources_backup.csv' CSV HEADER;
  ELSE
    RAISE NOTICE 'No non-RSS data sources found. Safe to rollback.';
  END IF;
END $$;

-- ============================================
-- 2. 删除新增的触发器
-- ============================================

DROP TRIGGER IF EXISTS update_data_sources_updated_at ON data_sources;

-- ============================================
-- 3. 更新外键约束
-- ============================================

-- 删除指向 data_sources 的外键
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_feed_id_fkey;

-- ============================================
-- 4. 删除新增的索引
-- ============================================

DROP INDEX IF EXISTS idx_data_sources_source_type;
DROP INDEX IF EXISTS idx_data_sources_priority;
DROP INDEX IF EXISTS idx_data_sources_type_enabled;

-- ============================================
-- 5. 重命名索引回原名
-- ============================================

ALTER INDEX IF EXISTS data_sources_pkey
RENAME TO rss_feeds_pkey;

ALTER INDEX IF EXISTS idx_data_sources_enabled
RENAME TO idx_rss_feeds_enabled;

ALTER INDEX IF EXISTS data_sources_rss_url_key
RENAME TO rss_feeds_url_key;

-- ============================================
-- 6. 删除新增的约束
-- ============================================

ALTER TABLE data_sources
DROP CONSTRAINT IF EXISTS data_sources_source_type_check;

ALTER TABLE data_sources
DROP CONSTRAINT IF EXISTS data_sources_rss_url_check;

ALTER TABLE data_sources
DROP CONSTRAINT IF EXISTS data_sources_api_url_check;

-- ============================================
-- 7. 删除新增的字段
-- ============================================

ALTER TABLE data_sources DROP COLUMN IF EXISTS source_type;
ALTER TABLE data_sources DROP COLUMN IF EXISTS api_url;
ALTER TABLE data_sources DROP COLUMN IF EXISTS api_config;
ALTER TABLE data_sources DROP COLUMN IF EXISTS fetch_interval;
ALTER TABLE data_sources DROP COLUMN IF EXISTS priority;

-- ============================================
-- 8. 字段重命名回原名
-- ============================================

ALTER TABLE data_sources RENAME COLUMN rss_url TO url;

-- ============================================
-- 9. 表重命名回原名
-- ============================================

ALTER TABLE data_sources RENAME TO rss_feeds;

-- ============================================
-- 10. 恢复外键约束
-- ============================================

ALTER TABLE deals
ADD CONSTRAINT rss_items_feed_id_fkey
  FOREIGN KEY (feed_id)
  REFERENCES rss_feeds(id)
  ON DELETE CASCADE;

-- ============================================
-- 11. 恢复触发器
-- ============================================

CREATE TRIGGER update_rss_feeds_updated_at
  BEFORE UPDATE ON rss_feeds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 12. 验证回滚
-- ============================================

DO $$
DECLARE
  record_count INT;
BEGIN
  SELECT COUNT(*) INTO record_count FROM rss_feeds;
  RAISE NOTICE 'Rollback successful: % RSS feeds restored', record_count;

  -- 验证表结构
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rss_feeds' AND column_name = 'url'
  ) THEN
    RAISE EXCEPTION 'Rollback validation failed: url column not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rss_feeds' AND column_name = 'source_type'
  ) THEN
    RAISE EXCEPTION 'Rollback validation failed: source_type column still exists';
  END IF;

  RAISE NOTICE 'Rollback validation passed successfully';
END $$;

-- ============================================
-- 13. 显示回滚结果
-- ============================================

SELECT
  'Rollback 003 completed successfully' AS status,
  COUNT(*) AS total_rss_feeds,
  COUNT(*) FILTER (WHERE enabled = true) AS enabled_feeds
FROM rss_feeds;

COMMIT;

-- ============================================
-- 回滚完成提示
-- ============================================
--
-- 回滚已完成。下一步操作:
-- 1. 恢复 DatabaseManager 代码:
--    - getDataSources() → getRSSFeeds()
--    - SQL 查询中的 data_sources → rss_feeds
--    - SQL 查询中的 rss_url → url
--
-- 2. 恢复测试用例中的表名引用
--
-- 3. 验证功能:
--    - 运行 Worker 测试
--    - 启动 Worker 服务验证
--
-- 4. 如果有非 RSS 数据源被删除，请从备份恢复
-- ============================================
