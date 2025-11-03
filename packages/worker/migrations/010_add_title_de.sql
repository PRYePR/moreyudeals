-- ============================================
-- 迁移脚本: 添加 title_de 字段（清理后的德语标题）
-- 用途: 实现三字段结构 original_title -> title_de -> title
-- 日期: 2025-11-02
-- ============================================

BEGIN;

-- 1. 添加 title_de 字段（清理后的德语标题）
ALTER TABLE deals ADD COLUMN IF NOT EXISTS title_de TEXT;

-- 2. 创建 title_de 的 GIN 索引（德语全文搜索）
CREATE INDEX IF NOT EXISTS idx_deals_title_de_gin
ON deals USING gin(to_tsvector('german', COALESCE(title_de, '')));

-- 3. 添加字段注释
COMMENT ON COLUMN deals.original_title IS '原始德语标题（含价格后缀）- 仅归档留存';
COMMENT ON COLUMN deals.title_de IS '清理后的德语标题 - 前端德语切换时显示，翻译源';
COMMENT ON COLUMN deals.title IS '中文翻译标题 - 前端默认显示（主字段）';

COMMIT;

-- 显示结果
SELECT '✅ title_de 字段添加完成' AS message;
SELECT
  COUNT(*) FILTER (WHERE title IS NOT NULL) as with_title,
  COUNT(*) FILTER (WHERE title_de IS NOT NULL) as with_title_de,
  COUNT(*) FILTER (WHERE original_title IS NOT NULL) as with_original_title,
  COUNT(*) as total
FROM deals;
