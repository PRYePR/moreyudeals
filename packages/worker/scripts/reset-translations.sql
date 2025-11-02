-- 重置已翻译的记录，让它们重新翻译
-- 使用新的翻译流程（保护换行符）

BEGIN;

-- 备份当前翻译状态
SELECT
  '📊 当前翻译状态:' as message,
  translation_status,
  COUNT(*) as count
FROM deals
GROUP BY translation_status
ORDER BY translation_status;

-- 重置为 pending 状态
-- 清空翻译内容，保留原始内容
UPDATE deals
SET
  translation_status = 'pending',
  title = original_title,  -- 恢复原始标题
  description = NULL       -- 清空翻译描述
WHERE translation_status = 'completed';

-- 显示重置结果
SELECT
  '✅ 重置完成' as message,
  COUNT(*) as reset_count
FROM deals
WHERE translation_status = 'pending';

COMMIT;

-- 显示最终状态
SELECT
  '📊 重置后状态:' as message,
  translation_status,
  COUNT(*) as count
FROM deals
GROUP BY translation_status
ORDER BY translation_status;
