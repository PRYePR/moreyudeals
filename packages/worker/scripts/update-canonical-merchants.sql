-- ============================================
-- 数据库脚本: 更新现有数据的商家规范化字段
-- 用途: 根据最新的 merchant-mapping.ts 配置更新数据库中的商家名称
-- 版本: 2.0
-- 日期: 2025-11-12
--
-- 使用方法:
-- psql "postgresql://用户名:密码@主机/数据库?sslmode=require" -f update-canonical-merchants.sql
--
-- 注意:
-- 1. 此脚本会更新所有现有数据的 canonical_merchant_id 和 canonical_merchant_name
-- 2. 不会影响 merchant 字段(保留原始商家名)
-- 3. 使用事务,如果出错会自动回滚
-- 4. 执行前建议先备份数据库
-- ============================================

BEGIN;

-- ============================================
-- 第一步: 更新已知商家(按 merchant-mapping.ts 配置)
-- ============================================

-- 亚马逊系列 (合并所有Amazon变体为 Amazon.de)
UPDATE deals
SET
  canonical_merchant_id = 'amazon-de',
  canonical_merchant_name = 'Amazon.de'
WHERE LOWER(merchant) IN (
  'amazon', 'amazon.de', 'amazon de', 'amazon.at', 'amazon at',
  'amazon.com', 'amazon germany', 'amazon deutschland',
  'amazon austria', 'amazon österreich', 'amazon.co.uk', 'amazon uk'
);

-- MediaMarkt
UPDATE deals
SET
  canonical_merchant_id = 'mediamarkt',
  canonical_merchant_name = 'MediaMarkt'
WHERE LOWER(merchant) IN (
  'mediamarkt', 'media markt', 'media-markt', 'mediamarkt.at', 'mediamarkt at'
);

-- Saturn
UPDATE deals
SET
  canonical_merchant_id = 'saturn',
  canonical_merchant_name = 'Saturn'
WHERE LOWER(merchant) IN ('saturn', 'saturn.at', 'saturn at');

-- Alza
UPDATE deals
SET
  canonical_merchant_id = 'alza',
  canonical_merchant_name = 'Alza'
WHERE LOWER(merchant) IN ('alza', 'alza.at', 'alza.de', 'alza.cz', 'alza at', 'alza de');

-- Hofer
UPDATE deals
SET
  canonical_merchant_id = 'hofer',
  canonical_merchant_name = 'Hofer'
WHERE LOWER(merchant) IN ('hofer', 'hofer.at', 'hofer at', 'aldi süd', 'aldi sued');

-- Billa
UPDATE deals
SET
  canonical_merchant_id = 'billa',
  canonical_merchant_name = 'Billa'
WHERE LOWER(merchant) IN ('billa', 'billa.at', 'billa at', 'billa plus');

-- Spar
UPDATE deals
SET
  canonical_merchant_id = 'spar',
  canonical_merchant_name = 'Spar'
WHERE LOWER(merchant) IN ('spar', 'spar.at', 'spar at', 'interspar', 'eurospar');

-- Lidl
UPDATE deals
SET
  canonical_merchant_id = 'lidl',
  canonical_merchant_name = 'Lidl'
WHERE LOWER(merchant) IN ('lidl', 'lidl.at', 'lidl at', 'lidl österreich');

-- Zalando
UPDATE deals
SET
  canonical_merchant_id = 'zalando',
  canonical_merchant_name = 'Zalando'
WHERE LOWER(merchant) IN ('zalando', 'zalando.at', 'zalando at', 'zalando lounge');

-- H&M
UPDATE deals
SET
  canonical_merchant_id = 'hm',
  canonical_merchant_name = 'H&M'
WHERE LOWER(merchant) IN ('h&m', 'h and m', 'hm', 'h&m.at', 'hennes & mauritz');

-- IKEA
UPDATE deals
SET
  canonical_merchant_id = 'ikea',
  canonical_merchant_name = 'IKEA'
WHERE LOWER(merchant) IN ('ikea', 'ikea.at', 'ikea at', 'ikea österreich');

-- XXXLutz
UPDATE deals
SET
  canonical_merchant_id = 'xxxlutz',
  canonical_merchant_name = 'XXXLutz'
WHERE LOWER(merchant) IN ('xxxlutz', 'xxx lutz', 'lutz', 'xxxlutz.at');

-- dm
UPDATE deals
SET
  canonical_merchant_id = 'dm',
  canonical_merchant_name = 'dm'
WHERE LOWER(merchant) IN (
  'dm', 'dm.at', 'dm at', 'dm drogerie markt', 'dm-drogerie markt'
);

-- Müller
UPDATE deals
SET
  canonical_merchant_id = 'mueller',
  canonical_merchant_name = 'Müller'
WHERE LOWER(merchant) IN ('müller', 'mueller', 'muller', 'müller.at', 'mueller.at');

-- Decathlon
UPDATE deals
SET
  canonical_merchant_id = 'decathlon',
  canonical_merchant_name = 'Decathlon'
WHERE LOWER(merchant) IN ('decathlon', 'decathlon.at', 'decathlon at');

-- Intersport
UPDATE deals
SET
  canonical_merchant_id = 'intersport',
  canonical_merchant_name = 'Intersport'
WHERE LOWER(merchant) IN ('intersport', 'intersport.at', 'intersport at');

-- eBay
UPDATE deals
SET
  canonical_merchant_id = 'ebay',
  canonical_merchant_name = 'eBay'
WHERE LOWER(merchant) IN ('ebay', 'ebay.at', 'ebay at', 'ebay austria');

-- willhaben
UPDATE deals
SET
  canonical_merchant_id = 'willhaben',
  canonical_merchant_name = 'willhaben'
WHERE LOWER(merchant) IN ('willhaben', 'willhaben.at', 'will haben');

-- tink
UPDATE deals
SET
  canonical_merchant_id = 'tink',
  canonical_merchant_name = 'tink'
WHERE LOWER(merchant) IN ('tink', 'tink.de', 'tink.at');

-- Samsung
UPDATE deals
SET
  canonical_merchant_id = 'samsung',
  canonical_merchant_name = 'Samsung'
WHERE LOWER(merchant) IN ('samsung', 'samsung.at', 'samsung at', 'samsung austria');

-- AliExpress
UPDATE deals
SET
  canonical_merchant_id = 'aliexpress',
  canonical_merchant_name = 'AliExpress'
WHERE LOWER(merchant) IN ('aliexpress', 'ali express', 'aliexpress.com');

-- eBay.de (德国站单独)
UPDATE deals
SET
  canonical_merchant_id = 'ebay-de',
  canonical_merchant_name = 'eBay.de'
WHERE LOWER(merchant) IN ('ebay de', 'ebay.de', 'ebay germany', 'ebay deutschland');

-- GymBeam
UPDATE deals
SET
  canonical_merchant_id = 'gymbeam',
  canonical_merchant_name = 'GymBeam'
WHERE LOWER(merchant) IN ('gymbeam', 'gym beam', 'gymbeam.at', 'gymbeam.de');

-- Bergzeit
UPDATE deals
SET
  canonical_merchant_id = 'bergzeit',
  canonical_merchant_name = 'Bergzeit'
WHERE LOWER(merchant) IN ('bergzeit', 'bergzeit.de', 'bergzeit.at');

-- 43einhalb
UPDATE deals
SET
  canonical_merchant_id = '43einhalb',
  canonical_merchant_name = '43einhalb'
WHERE LOWER(merchant) IN ('43einhalb', '43 einhalb', '43einhalb.com');

-- AFEW Store
UPDATE deals
SET
  canonical_merchant_id = 'afew-store',
  canonical_merchant_name = 'AFEW Store'
WHERE LOWER(merchant) IN ('afew', 'afew store', 'afew-store', 'afew-store.com');

-- Smyths Toys
UPDATE deals
SET
  canonical_merchant_id = 'smyths-toys',
  canonical_merchant_name = 'Smyths Toys'
WHERE LOWER(merchant) IN ('smyths', 'smyths toys', 'smyths-toys', 'smythstoys', 'smyths.at');

-- FlexiSpot
UPDATE deals
SET
  canonical_merchant_id = 'flexispot',
  canonical_merchant_name = 'FlexiSpot'
WHERE LOWER(merchant) IN ('flexispot', 'flexi spot', 'flexispot.de', 'flexispot.at');

-- Shark
UPDATE deals
SET
  canonical_merchant_id = 'shark',
  canonical_merchant_name = 'Shark'
WHERE LOWER(merchant) IN ('shark', 'shark.at', 'sharkclean');

-- 新增商家 (2025-11-12)
-- getgoods
UPDATE deals
SET
  canonical_merchant_id = 'getgoods',
  canonical_merchant_name = 'getgoods'
WHERE LOWER(merchant) IN ('getgoods', 'getgoods.com', 'getgoods.de');

-- ABOUT YOU
UPDATE deals
SET
  canonical_merchant_id = 'about-you',
  canonical_merchant_name = 'ABOUT YOU'
WHERE LOWER(merchant) IN ('about you', 'aboutyou', 'about-you', 'aboutyou.at', 'aboutyou.de');

-- SportSpar
UPDATE deals
SET
  canonical_merchant_id = 'sportspar',
  canonical_merchant_name = 'SportSpar'
WHERE LOWER(merchant) IN ('sportspar', 'sport spar', 'sportspar.de', 'sportspar.at');

-- Ninja Kitchen
UPDATE deals
SET
  canonical_merchant_id = 'ninja-kitchen',
  canonical_merchant_name = 'Ninja Kitchen'
WHERE LOWER(merchant) IN ('ninja', 'ninja kitchen', 'ninja-kitchen', 'ninjakitchen', 'ninjakitchen.de');

-- Gastroback
UPDATE deals
SET
  canonical_merchant_id = 'gastroback',
  canonical_merchant_name = 'Gastroback'
WHERE LOWER(merchant) IN ('gastroback', 'gastroback.de');

-- Thalia
UPDATE deals
SET
  canonical_merchant_id = 'thalia',
  canonical_merchant_name = 'Thalia'
WHERE LOWER(merchant) IN ('thalia', 'thalia.at', 'thalia.de');

-- Yves Rocher (合并两种写法)
UPDATE deals
SET
  canonical_merchant_id = 'yves-rocher',
  canonical_merchant_name = 'Yves Rocher'
WHERE LOWER(merchant) IN (
  'yves rocher', 'yves-rocher', 'yvesrocher',
  'yves-rocher.at', 'yves-rocher.de'
);

-- Zooplus
UPDATE deals
SET
  canonical_merchant_id = 'zooplus',
  canonical_merchant_name = 'Zooplus'
WHERE LOWER(merchant) IN ('zooplus', 'zooplus.at', 'zooplus.de', 'zooplus at');

-- oeticket
UPDATE deals
SET
  canonical_merchant_id = 'oeticket',
  canonical_merchant_name = 'oeticket'
WHERE LOWER(merchant) IN ('oeticket', 'ö-ticket', 'oeticket.com');

-- Lidl Connect
UPDATE deals
SET
  canonical_merchant_id = 'lidl-connect',
  canonical_merchant_name = 'Lidl Connect'
WHERE LOWER(merchant) IN ('lidl connect', 'lidl-connect', 'lidlconnect');

-- IndieGala
UPDATE deals
SET
  canonical_merchant_id = 'indiegala',
  canonical_merchant_name = 'IndieGala'
WHERE LOWER(merchant) IN ('indiegala', 'indie gala', 'indiegala.com');

-- HelloFresh
UPDATE deals
SET
  canonical_merchant_id = 'hellofresh',
  canonical_merchant_name = 'HelloFresh'
WHERE LOWER(merchant) IN ('hellofresh', 'hello fresh', 'hellofresh.at', 'hellofresh.de');

-- Google Store
UPDATE deals
SET
  canonical_merchant_id = 'google',
  canonical_merchant_name = 'Google Store'
WHERE LOWER(merchant) IN ('google', 'google store', 'google-store', 'store.google.com');

-- Snapmaker
UPDATE deals
SET
  canonical_merchant_id = 'snapmaker',
  canonical_merchant_name = 'Snapmaker'
WHERE LOWER(merchant) IN ('snapmaker', 'snapmaker.com', 'eu.snapmaker.com');

-- Bob
UPDATE deals
SET
  canonical_merchant_id = 'bob',
  canonical_merchant_name = 'Bob'
WHERE LOWER(merchant) IN ('bob');

-- ============================================
-- 第二步: 为未匹配的商家生成默认规范化名称
-- ============================================
UPDATE deals
SET
  canonical_merchant_id = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(merchant, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')),
  canonical_merchant_name = merchant
WHERE merchant IS NOT NULL
  AND (canonical_merchant_name IS NULL OR canonical_merchant_name = '');

COMMIT;
