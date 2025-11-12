/**
 * 日期解析工具
 * 用于解析各种格式的相对时间表达式
 */

/**
 * 解析德语相对时间表达式
 *
 * 支持的格式：
 * - "noch 11 Stunden" → 当前时间 + 11小时
 * - "noch 9 Tage" → 当前时间 + 9天
 * - "noch 2 Wochen" → 当前时间 + 2周
 * - "noch 3 Monate" → 当前时间 + 3个月
 * - "abgelaufen" → 当前时间（已过期）
 * - "in 7Std 24Min 2s" → 当前时间 + 7小时24分钟（Preisjaeger 紧凑格式）
 *
 * @param text 德语时间表达式
 * @param baseDate 基准时间（默认为当前时间）
 * @returns 计算后的到期时间，如果无法解析返回 undefined
 */
export function parseGermanRelativeTime(
  text: string | undefined,
  baseDate: Date = new Date()
): Date | undefined {
  if (!text) return undefined;

  const normalizedText = text.toLowerCase().trim();

  // 1. "abgelaufen" - 已过期
  if (normalizedText.includes('abgelaufen')) {
    return baseDate; // 返回当前时间作为过期时间
  }

  // 2. Preisjaeger 紧凑格式: "in 7Std 24Min 2s" 或 "7Std 24Min"
  // 提取所有时间单位
  const compactMatch = normalizedText.match(/(\d+)\s*std|(\d+)\s*min|(\d+)\s*s/gi);
  if (compactMatch && compactMatch.length > 0) {
    let totalMilliseconds = 0;

    compactMatch.forEach(match => {
      const hoursCompact = match.match(/(\d+)\s*std/i);
      const minutesCompact = match.match(/(\d+)\s*min/i);
      const secondsCompact = match.match(/(\d+)\s*s(?!t)/i); // s 但不是 std

      if (hoursCompact) {
        totalMilliseconds += parseInt(hoursCompact[1], 10) * 60 * 60 * 1000;
      }
      if (minutesCompact) {
        totalMilliseconds += parseInt(minutesCompact[1], 10) * 60 * 1000;
      }
      if (secondsCompact) {
        totalMilliseconds += parseInt(secondsCompact[1], 10) * 1000;
      }
    });

    if (totalMilliseconds > 0) {
      return new Date(baseDate.getTime() + totalMilliseconds);
    }
  }

  // 3. "noch X Minuten"
  const minutesMatch = normalizedText.match(/noch\s+(\d+)\s+minuten?/i);
  if (minutesMatch) {
    const minutes = parseInt(minutesMatch[1], 10);
    return new Date(baseDate.getTime() + minutes * 60 * 1000);
  }

  // 4. "noch X Stunden"
  const hoursMatch = normalizedText.match(/noch\s+(\d+)\s+stunden?/i);
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1], 10);
    return new Date(baseDate.getTime() + hours * 60 * 60 * 1000);
  }

  // 5. "noch X Tage"
  const daysMatch = normalizedText.match(/noch\s+(\d+)\s+tage?/i);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    return new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
  }

  // 6. "noch X Wochen"
  const weeksMatch = normalizedText.match(/noch\s+(\d+)\s+wochen?/i);
  if (weeksMatch) {
    const weeks = parseInt(weeksMatch[1], 10);
    return new Date(baseDate.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
  }

  // 7. "noch X Monate"
  const monthsMatch = normalizedText.match(/noch\s+(\d+)\s+monate?/i);
  if (monthsMatch) {
    const months = parseInt(monthsMatch[1], 10);
    const result = new Date(baseDate);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  // 无法解析
  return undefined;
}

/**
 * 解析英语相对时间表达式（预留接口）
 *
 * 支持的格式：
 * - "11 hours left"
 * - "9 days remaining"
 * - "expired"
 *
 * @param text 英语时间表达式
 * @param baseDate 基准时间
 * @returns 计算后的到期时间
 */
export function parseEnglishRelativeTime(
  text: string | undefined,
  baseDate: Date = new Date()
): Date | undefined {
  if (!text) return undefined;

  const normalizedText = text.toLowerCase().trim();

  // "expired"
  if (normalizedText.includes('expired')) {
    return baseDate;
  }

  // "X hours left/remaining"
  const hoursMatch = normalizedText.match(/(\d+)\s+hours?\s+(?:left|remaining)/i);
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1], 10);
    return new Date(baseDate.getTime() + hours * 60 * 60 * 1000);
  }

  // "X days left/remaining"
  const daysMatch = normalizedText.match(/(\d+)\s+days?\s+(?:left|remaining)/i);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    return new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
  }

  return undefined;
}

/**
 * 通用相对时间解析器
 * 自动检测语言并调用对应的解析器
 *
 * @param text 时间表达式
 * @param baseDate 基准时间
 * @returns 计算后的到期时间
 */
export function parseRelativeTime(
  text: string | undefined,
  baseDate: Date = new Date()
): Date | undefined {
  if (!text) return undefined;

  // 先尝试德语
  const germanResult = parseGermanRelativeTime(text, baseDate);
  if (germanResult) return germanResult;

  // 再尝试英语
  const englishResult = parseEnglishRelativeTime(text, baseDate);
  if (englishResult) return englishResult;

  return undefined;
}
