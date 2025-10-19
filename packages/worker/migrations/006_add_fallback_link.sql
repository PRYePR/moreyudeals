-- Migration: 添加 fallback_link 字段
-- Description: 为 deals 表添加 fallback_link 列,用于存储文章URL作为临时跳转链接
-- Date: 2025-01-19

BEGIN;

-- 添加 fallback_link 列
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS fallback_link TEXT;

-- 添加注释
COMMENT ON COLUMN deals.fallback_link IS '临时回退链接(文章URL),当 merchant_link 未从首页HTML抓取到时使用';

-- 为现有记录填充 fallback_link (使用 link 字段的值)
UPDATE deals
SET fallback_link = link
WHERE fallback_link IS NULL;

COMMIT;

-- 验证
SELECT
    COUNT(*) as total_deals,
    COUNT(merchant_link) as with_merchant_link,
    COUNT(fallback_link) as with_fallback_link
FROM deals;
