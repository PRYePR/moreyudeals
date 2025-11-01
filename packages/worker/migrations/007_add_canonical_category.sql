-- ============================================
-- 迁移脚本: 添加标准分类字段
-- 用途: 支持多数据源的分类归一化
-- 日期: 2025-11-01
-- ============================================

BEGIN;

-- 1. 添加 canonical_category 字段
-- 用于存储映射后的标准分类
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS canonical_category VARCHAR(50);

-- 2. 添加索引以优化按标准分类查询
CREATE INDEX IF NOT EXISTS idx_deals_canonical_category
ON deals(canonical_category)
WHERE canonical_category IS NOT NULL;

-- 3. 添加注释
COMMENT ON COLUMN deals.canonical_category IS '标准分类 - 所有数据源的分类都映射到统一的标准分类体系';
COMMENT ON COLUMN deals.categories IS '原始分类数组 - 保留来源网站的原始分类标签';

-- 4. 迁移现有数据（可选 - 将在应用层处理）
-- 这里只标记需要重新映射的记录
-- UPDATE deals SET canonical_category = NULL WHERE canonical_category IS NULL;

COMMIT;

-- 显示更新结果
SELECT 'canonical_category 字段添加完成' AS message;
SELECT
  COUNT(*) FILTER (WHERE canonical_category IS NOT NULL) as with_canonical,
  COUNT(*) FILTER (WHERE canonical_category IS NULL) as without_canonical,
  COUNT(*) as total
FROM deals;
