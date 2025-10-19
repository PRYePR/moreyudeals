-- ============================================
-- 迁移脚本: 添加价格更新信息字段
-- 日期: 2025-10-17
-- 描述: 添加 price_update_note 和 previous_price 字段到 deals 表
-- ============================================

BEGIN;

-- 添加价格更新说明字段
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS price_update_note TEXT;

-- 添加上次观察到的价格字段
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS previous_price DECIMAL(10,2);

COMMIT;

-- 显示迁移结果
SELECT 'price_update_note 和 previous_price 字段添加完成' AS message;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'deals'
  AND column_name IN ('price_update_note', 'previous_price');
