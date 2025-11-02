-- ============================================
-- 迁移脚本: 添加规范商家字段
-- 用途: 支持多数据源的商家名称归一化
-- 日期: 2025-11-02
-- ============================================

BEGIN;

-- 1. 添加规范商家字段
-- canonical_merchant_id: 规范商家ID (用于URL和API, 小写英文)
-- canonical_merchant_name: 规范商家显示名称 (前端展示用)
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS canonical_merchant_id VARCHAR(100);

ALTER TABLE deals
ADD COLUMN IF NOT EXISTS canonical_merchant_name VARCHAR(200);

-- 2. 添加索引以优化按规范商家查询
CREATE INDEX IF NOT EXISTS idx_deals_canonical_merchant_id
ON deals(canonical_merchant_id)
WHERE canonical_merchant_id IS NOT NULL;

-- 3. 添加注释
COMMENT ON COLUMN deals.canonical_merchant_id IS '规范商家ID - 用于URL和API，所有数据源的商家名都映射到统一的规范ID';
COMMENT ON COLUMN deals.canonical_merchant_name IS '规范商家显示名称 - 前端展示用，统一的商家品牌名称';
COMMENT ON COLUMN deals.merchant IS '原始商家名称 - 保留来源网站的原始商家名称';

-- 4. 迁移现有数据（将在应用层处理）
-- 现有记录的规范商家字段将在下次抓取时填充

COMMIT;

-- 显示更新结果
SELECT '规范商家字段添加完成' AS message;
SELECT
  COUNT(*) FILTER (WHERE canonical_merchant_id IS NOT NULL) as with_canonical,
  COUNT(*) FILTER (WHERE canonical_merchant_id IS NULL) as without_canonical,
  COUNT(*) as total
FROM deals;
