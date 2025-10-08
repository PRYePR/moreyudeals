/**
 * 文本清理工具
 * 清理 HTML 标签、特殊字符等
 */

/**
 * 文本清理器
 */
export class TextCleaner {
  /**
   * 清理描述文本
   *
   * - 移除 HTML 标签
   * - 移除 HTML 实体
   * - 规范化空格
   * - 限制长度
   */
  cleanDescription(description: string, maxLength: number = 300): string {
    return description
      .replace(/<[^>]*>/g, '')           // 移除 HTML 标签
      .replace(/&[a-zA-Z0-9#]+;/g, '')   // 移除 HTML 实体
      .replace(/\s+/g, ' ')               // 规范化空格
      .trim()
      .substring(0, maxLength)
  }

  /**
   * 清理 HTML 内容
   *
   * - 移除 script 标签
   * - 移除 style 标签
   * - 移除注释
   */
  cleanHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')  // 移除 script
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')    // 移除 style
      .replace(/<!--[\s\S]*?-->/g, '')                    // 移除注释
      .trim()
  }

  /**
   * 规范化空格和特殊字符
   */
  normalizeWhitespace(text: string): string {
    return text
      .replace(/\s+/g, ' ')              // 多个空格变成一个
      .replace(/\n\s*\n/g, '\n')         // 多个换行变成一个
      .trim()
  }

  /**
   * 移除特殊字符（保留基本标点）
   */
  removeSpecialChars(text: string): string {
    return text.replace(/[^\w\s.,!?€$¥£-]/g, '')
  }

  /**
   * 截断文本到指定长度（保持单词完整性）
   */
  truncate(text: string, maxLength: number, suffix: string = '...'): string {
    if (text.length <= maxLength) {
      return text
    }

    const truncated = text.substring(0, maxLength - suffix.length)
    const lastSpace = truncated.lastIndexOf(' ')

    if (lastSpace > 0) {
      return truncated.substring(0, lastSpace) + suffix
    }

    return truncated + suffix
  }
}

// 导出单例
export const textCleaner = new TextCleaner()
