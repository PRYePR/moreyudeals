-- ============================================
-- 回填脚本: 为旧数据填充规范商家字段
-- 用途: 为已有数据补充 canonical_merchant_name
-- 日期: 2025-11-02
-- ============================================

BEGIN;

-- 更新 Amazon
UPDATE deals
SET
  canonical_merchant_id = 'amazon-at',
  canonical_merchant_name = 'Amazon.at'
WHERE merchant IN ('Amazon', 'amazon', 'amazon.at')
  AND canonical_merchant_name IS NULL;

-- 更新 MediaMarkt
UPDATE deals
SET
  canonical_merchant_id = 'mediamarkt',
  canonical_merchant_name = 'MediaMarkt'
WHERE merchant IN ('MediaMarkt', 'mediamarkt', 'media markt', 'MediaMarkt.at')
  AND canonical_merchant_name IS NULL;

-- 更新 Saturn
UPDATE deals
SET
  canonical_merchant_id = 'saturn',
  canonical_merchant_name = 'Saturn'
WHERE merchant IN ('Saturn', 'saturn', 'Saturn.at')
  AND canonical_merchant_name IS NULL;

-- 更新 XXXLutz
UPDATE deals
SET
  canonical_merchant_id = 'xxxlutz',
  canonical_merchant_name = 'XXXLutz'
WHERE merchant IN ('XXXLutz', 'xxxlutz', 'XXX Lutz')
  AND canonical_merchant_name IS NULL;

-- 更新 IKEA
UPDATE deals
SET
  canonical_merchant_id = 'ikea',
  canonical_merchant_name = 'IKEA'
WHERE merchant IN ('IKEA', 'ikea', 'Ikea')
  AND canonical_merchant_name IS NULL;

-- 更新 Zalando
UPDATE deals
SET
  canonical_merchant_id = 'zalando',
  canonical_merchant_name = 'Zalando'
WHERE merchant IN ('Zalando', 'zalando', 'Zalando.at')
  AND canonical_merchant_name IS NULL;

-- 更新 H&M
UPDATE deals
SET
  canonical_merchant_id = 'hm',
  canonical_merchant_name = 'H&M'
WHERE merchant IN ('H&M', 'hm', 'H and M')
  AND canonical_merchant_name IS NULL;

-- 更新 dm
UPDATE deals
SET
  canonical_merchant_id = 'dm',
  canonical_merchant_name = 'dm'
WHERE merchant IN ('dm', 'DM', 'dm.at', 'dm drogerie markt')
  AND canonical_merchant_name IS NULL;

-- 更新 Müller
UPDATE deals
SET
  canonical_merchant_id = 'mueller',
  canonical_merchant_name = 'Müller'
WHERE merchant IN ('Müller', 'Mueller', 'mueller', 'Muller')
  AND canonical_merchant_name IS NULL;

-- 更新 Lidl
UPDATE deals
SET
  canonical_merchant_id = 'lidl',
  canonical_merchant_name = 'Lidl'
WHERE merchant IN ('Lidl', 'lidl', 'Lidl.at')
  AND canonical_merchant_name IS NULL;

-- 更新 Hofer
UPDATE deals
SET
  canonical_merchant_id = 'hofer',
  canonical_merchant_name = 'Hofer'
WHERE merchant IN ('Hofer', 'hofer', 'Hofer.at')
  AND canonical_merchant_name IS NULL;

-- 更新 Billa
UPDATE deals
SET
  canonical_merchant_id = 'billa',
  canonical_merchant_name = 'Billa'
WHERE merchant IN ('Billa', 'billa', 'Billa.at')
  AND canonical_merchant_name IS NULL;

-- 更新 Spar
UPDATE deals
SET
  canonical_merchant_id = 'spar',
  canonical_merchant_name = 'Spar'
WHERE merchant IN ('Spar', 'spar', 'SPAR', 'Interspar', 'Eurospar')
  AND canonical_merchant_name IS NULL;

-- 更新 Alza
UPDATE deals
SET
  canonical_merchant_id = 'alza',
  canonical_merchant_name = 'Alza'
WHERE merchant IN ('Alza', 'alza', 'Alza.at')
  AND canonical_merchant_name IS NULL;

-- 更新 Decathlon
UPDATE deals
SET
  canonical_merchant_id = 'decathlon',
  canonical_merchant_name = 'Decathlon'
WHERE merchant IN ('Decathlon', 'decathlon', 'Decathlon.at')
  AND canonical_merchant_name IS NULL;

-- 更新 Intersport
UPDATE deals
SET
  canonical_merchant_id = 'intersport',
  canonical_merchant_name = 'Intersport'
WHERE merchant IN ('Intersport', 'intersport', 'Intersport.at')
  AND canonical_merchant_name IS NULL;

-- 更新 eBay
UPDATE deals
SET
  canonical_merchant_id = 'ebay',
  canonical_merchant_name = 'eBay'
WHERE merchant IN ('eBay', 'ebay', 'Ebay', 'eBay.at')
  AND canonical_merchant_name IS NULL;

-- 更新 willhaben
UPDATE deals
SET
  canonical_merchant_id = 'willhaben',
  canonical_merchant_name = 'willhaben'
WHERE merchant IN ('willhaben', 'Willhaben', 'will haben')
  AND canonical_merchant_name IS NULL;

-- 对于未匹配的商家，生成默认的 canonical_merchant_id 和 canonical_merchant_name
UPDATE deals
SET
  canonical_merchant_id = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(merchant, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')),
  canonical_merchant_name = merchant
WHERE merchant IS NOT NULL
  AND canonical_merchant_name IS NULL;

COMMIT;

-- 显示更新结果
SELECT '规范商家字段回填完成' AS message;
SELECT
  COUNT(*) FILTER (WHERE canonical_merchant_name IS NOT NULL) as with_canonical,
  COUNT(*) FILTER (WHERE canonical_merchant_name IS NULL) as without_canonical,
  COUNT(*) as total
FROM deals;

-- 显示回填统计
SELECT
  canonical_merchant_name,
  COUNT(*) as count
FROM deals
WHERE canonical_merchant_name IS NOT NULL
GROUP BY canonical_merchant_name
ORDER BY count DESC
LIMIT 20;
