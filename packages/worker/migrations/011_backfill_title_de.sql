-- ============================================
-- 迁移脚本: 回填历史数据到新的三字段结构
-- 用途: 将现有的 title 移到 title_de，清空 title 等待重新翻译
-- 日期: 2025-11-02
-- ============================================

BEGIN;

-- 1. 回填历史数据
-- 假设现有数据：title 存的是清理后的德语标题或中文翻译
-- 策略：
--   - 如果 title 不为空且 title_de 为空，将 title 移到 title_de
--   - 清空 title，等待重新翻译
--   - 重新标记为 pending 翻译状态

UPDATE deals
SET
  title_de = title,  -- 将当前的 title 移到 title_de
  title = NULL,      -- 清空 title，等待翻译填充中文
  translation_status = 'pending'  -- 重新标记为待翻译
WHERE title_de IS NULL
  AND title IS NOT NULL;

COMMIT;

-- 显示回填结果
SELECT '✅ 历史数据回填完成' AS message;
SELECT
  COUNT(*) FILTER (WHERE title IS NOT NULL) as with_chinese,
  COUNT(*) FILTER (WHERE title_de IS NOT NULL) as with_german,
  COUNT(*) FILTER (WHERE translation_status = 'pending') as need_translation,
  COUNT(*) as total
FROM deals;
