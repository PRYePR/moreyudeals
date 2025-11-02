/**
 * HTML清理工具
 * 修复DeepL翻译HTML时产生的格式问题
 */

/**
 * 翻译前预处理：保护内容中的换行符
 * DeepL 会删除纯文本中的换行符，但会保留 HTML 标签间的换行
 *
 * @param html 原始 HTML 内容
 * @returns 预处理后的 HTML
 */
export function prepareForTranslation(html: string): string {
  if (!html) return html;

  // DeepL 对 HTML 的处理：
  // 1. 保留 HTML 标签结构
  // 2. 保留标签之间的换行（格式化用）
  // 3. 删除纯文本段落内的换行
  //
  // 因此我们不需要预处理，直接发送给 DeepL 即可
  return html;
}

/**
 * 清理翻译后的HTML
 * 修复DeepL翻译导致的格式问题：
 * 1. 移除DeepL在块级标签后添加的孤立句号
 * 2. 保留原有的HTML结构和格式
 */
export function cleanTranslatedHtml(html: string): string {
  if (!html) return html;

  let cleaned = html;

  // 1. 移除块级标签闭合后的孤立句号（DeepL的典型错误）
  // 例如：</p>。 -> </p>
  // 只移除句号，保留原有的空白和换行
  cleaned = cleaned.replace(/(<\/(p|div|h[1-6]|ul|ol|li|blockquote)>)[。.]/gi, '$1');

  // 2. 移除段落/列表项开头的孤立句号
  // 例如：<p>。文本 -> <p>文本
  cleaned = cleaned.replace(/(<(p|div|li|h[1-6])>)\s*[。.]\s*/gi, '$1');

  // 3. 清理首尾空白
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * 检测HTML是否有格式问题
 */
export function hasHtmlFormatIssues(html: string): boolean {
  if (!html) return false;

  // 检测标签外的单独句号
  const hasOrphanPunctuation = /(<\/[^>]+>)[。.]\s*/.test(html);

  // 检测不匹配的标签
  const openTags = html.match(/<[^/][^>]*>/g) || [];
  const closeTags = html.match(/<\/[^>]+>/g) || [];
  const hasUnbalancedTags = openTags.length !== closeTags.length;

  return hasOrphanPunctuation || hasUnbalancedTags;
}
