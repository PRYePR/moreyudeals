/**
 * 商家 Logo 映射表
 *
 * 用途：
 * - 为特定商家提供高质量的官方 logo
 * - 覆盖默认的 Google Favicon
 *
 * 使用方法：
 * 1. 添加商家名称（与 _embedded['wp:term'].name 匹配）
 * 2. 提供 logo URL（建议使用 CDN）
 */

export const MERCHANT_LOGO_OVERRIDES: Record<string, string> = {
  // 示例：
  // 'Amazon': 'https://cdn.example.com/logos/amazon.png',
  // 'MediaMarkt': 'https://cdn.example.com/logos/mediamarkt.png',
};

/**
 * 获取商家 logo URL
 *
 * @param merchantName - 商家名称
 * @param domain - 商家域名（用于生成 favicon）
 * @returns Logo URL
 */
export function getMerchantLogo(merchantName: string, domain: string): string {
  // 优先使用映射表中的自定义 logo
  if (MERCHANT_LOGO_OVERRIDES[merchantName]) {
    return MERCHANT_LOGO_OVERRIDES[merchantName];
  }

  // 默认使用 Google Favicon 服务
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}
