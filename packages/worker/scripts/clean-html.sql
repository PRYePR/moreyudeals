-- 清理翻译后的HTML格式问题
-- 修复DeepL翻译导致的标签外句号等问题

BEGIN;

-- 1. 移除 </blockquote> 后的单独句号
UPDATE deals
SET description = REGEXP_REPLACE(description, '(<\/blockquote>)[。.][\s\n]*', '\1\n', 'g')
WHERE translation_status = 'completed'
  AND description ~ '(<\/blockquote>)[。.]';

-- 2. 移除 </p> 后的单独句号
UPDATE deals
SET description = REGEXP_REPLACE(description, '(<\/p>)[。.][\s\n]*', '\1\n', 'g')
WHERE translation_status = 'completed'
  AND description ~ '(<\/p>)[。.]';

-- 3. 移除 </div> 后的单独句号
UPDATE deals
SET description = REGEXP_REPLACE(description, '(<\/div>)[。.][\s\n]*', '\1\n', 'g')
WHERE translation_status = 'completed'
  AND description ~ '(<\/div>)[。.]';

-- 4. 移除 </li> 后的单独句号
UPDATE deals
SET description = REGEXP_REPLACE(description, '(<\/li>)[。.][\s\n]*', '\1\n', 'g')
WHERE translation_status = 'completed'
  AND description ~ '(<\/li>)[。.]';

-- 5. 移除多余的空行（3个以上连续换行）
UPDATE deals
SET description = REGEXP_REPLACE(description, '\n{3,}', E'\n\n', 'g')
WHERE translation_status = 'completed'
  AND description ~ '\n{3,}';

-- 6. 移除段落开头的单独句号
UPDATE deals
SET description = REGEXP_REPLACE(description, '^\s*[。.]\s*', '', 'gm')
WHERE translation_status = 'completed'
  AND description ~ '^\s*[。.]';

COMMIT;

-- 显示清理结果
SELECT
  '✅ HTML清理完成' as message,
  COUNT(*) as total_deals,
  COUNT(*) FILTER (WHERE description !~ '(<\/[^>]+>)[。.]') as cleaned_deals
FROM deals
WHERE translation_status = 'completed';
