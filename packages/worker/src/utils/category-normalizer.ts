/**
 * 分类规范化工具
 *
 * 负责将各种分类名称写法统一为规范的ID和显示名称
 * 支持多站点、多语言的分类映射
 */

import { CATEGORY_MAPPINGS, type CategoryMapping } from '../config/category-mapping';

/**
 * 规范化结果
 */
export interface NormalizedCategory {
  /** 规范分类ID */
  canonicalId: string;
  /** 规范分类中文名称 */
  canonicalName: string;
  /** 规范分类德文名称 */
  canonicalNameDe: string;
  /** 原始分类名称 */
  originalName: string;
  /** 是否匹配到规范配置 */
  isMatched: boolean;
  /** 父分类ID (如果有) */
  parentId?: string;
  /** 匹配到的配置 (如果有) */
  mapping?: CategoryMapping;
}

/**
 * 规范化分类名称
 *
 * @param categoryName - 原始分类名称
 * @param sourceSite - 来源站点 (如 'preisjaeger', 'sparhamster')
 * @returns 规范化后的分类信息
 *
 * @example
 * ```ts
 * // Preisjaeger分类
 * normalizeCategory('Elektronik', 'preisjaeger')
 * // => { canonicalId: 'electronics', canonicalName: '电子产品', isMatched: true }
 *
 * // Sparhamster分类
 * normalizeCategory('电子', 'sparhamster')
 * // => { canonicalId: 'electronics', canonicalName: '电子产品', isMatched: true }
 *
 * // 未匹配到，使用原始名称
 * normalizeCategory('Unknown Category', 'other')
 * // => { canonicalId: 'unknown-category', canonicalName: 'Unknown Category', isMatched: false }
 * ```
 */
export function normalizeCategory(
  categoryName: string | undefined | null,
  sourceSite: string = 'unknown'
): NormalizedCategory {
  // 处理空值
  if (!categoryName || categoryName.trim() === '') {
    return {
      canonicalId: 'uncategorized',
      canonicalName: '未分类',
      canonicalNameDe: 'Unkategorisiert',
      originalName: categoryName || '',
      isMatched: false
    };
  }

  // 清理分类名称: 去除首尾空白，统一为小写用于匹配
  const cleanName = categoryName.trim();
  const normalizedName = cleanName.toLowerCase();

  // 查找匹配的映射配置
  const mapping = CATEGORY_MAPPINGS.find(m => {
    // 首先检查该站点的别名
    const siteAliases = m.aliases[sourceSite] || [];
    if (siteAliases.some(alias => alias.toLowerCase() === normalizedName)) {
      return true;
    }

    // 如果站点未匹配，尝试所有站点的别名
    return Object.values(m.aliases)
      .flat()
      .some(alias => alias.toLowerCase() === normalizedName);
  });

  if (mapping) {
    // 找到匹配的规范配置
    return {
      canonicalId: mapping.canonicalId,
      canonicalName: mapping.canonicalName,
      canonicalNameDe: mapping.canonicalNameDe,
      originalName: cleanName,
      isMatched: true,
      parentId: mapping.parentId,
      mapping
    };
  }

  // 未找到匹配，使用原始名称并生成 ID
  return {
    canonicalId: generateCategoryId(cleanName),
    canonicalName: cleanName,
    canonicalNameDe: cleanName,
    originalName: cleanName,
    isMatched: false
  };
}

/**
 * 从分类名称生成规范 ID
 *
 * 规则:
 * - 转小写
 * - 移除特殊字符
 * - 空格和 & 替换为连字符
 * - 移除多余的连字符
 *
 * @param name - 分类名称
 * @returns 生成的 ID
 *
 * @example
 * ```ts
 * generateCategoryId('Home & Living') // => 'home-living'
 * generateCategoryId('电子产品') // => '电子产品'
 * generateCategoryId('Küche & Kochen') // => 'kueche-kochen'
 * ```
 */
function generateCategoryId(name: string): string {
  return name
    .toLowerCase()
    // 替换德语特殊字符为标准字符
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    // 替换 & 和空格为连字符
    .replace(/\s*&\s*/g, '-')
    .replace(/\s+/g, '-')
    // 移除非字母数字和连字符的字符 (保留中文)
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '')
    // 移除多余的连字符
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * 批量规范化分类名称
 *
 * @param categoryNames - 分类名称列表
 * @param sourceSite - 来源站点
 * @returns 规范化结果列表
 */
export function normalizeCategories(
  categoryNames: string[],
  sourceSite: string = 'unknown'
): NormalizedCategory[] {
  return categoryNames.map(name => normalizeCategory(name, sourceSite));
}

/**
 * 获取所有规范分类列表
 *
 * @returns 所有已配置的规范分类
 */
export function getAllCanonicalCategories(): CategoryMapping[] {
  return CATEGORY_MAPPINGS;
}

/**
 * 根据规范ID查找分类配置
 *
 * @param canonicalId - 规范分类ID
 * @returns 分类配置，如果未找到则返回 null
 */
export function getCategoryByCanonicalId(canonicalId: string): CategoryMapping | null {
  return CATEGORY_MAPPINGS.find(c => c.canonicalId === canonicalId) || null;
}

/**
 * 检查分类名称是否已配置规范映射
 *
 * @param categoryName - 分类名称
 * @param sourceSite - 来源站点
 * @returns 是否已配置
 */
export function isCategoryMapped(categoryName: string, sourceSite: string = 'unknown'): boolean {
  const result = normalizeCategory(categoryName, sourceSite);
  return result.isMatched;
}

/**
 * 获取分类的完整层级路径
 *
 * @param canonicalId - 规范分类ID
 * @returns 从根到该分类的完整路径数组
 *
 * @example
 * ```ts
 * getCategoryPath('coffee-machines')
 * // => ['home-living', 'home-appliances', 'coffee-machines']
 * ```
 */
export function getCategoryPath(canonicalId: string): string[] {
  const path: string[] = [];
  let currentId: string | undefined = canonicalId;

  // 最多追溯10层，防止循环引用
  let maxDepth = 10;

  while (currentId && maxDepth > 0) {
    path.unshift(currentId);

    const category = getCategoryByCanonicalId(currentId);
    if (!category || !category.parentId) {
      break;
    }

    currentId = category.parentId;
    maxDepth--;
  }

  return path;
}

/**
 * 获取分类的所有子分类
 *
 * @param canonicalId - 规范分类ID
 * @returns 所有直接子分类列表
 *
 * @example
 * ```ts
 * getChildCategories('home-living')
 * // => [CategoryMapping(home-appliances), CategoryMapping(kitchen-cooking), ...]
 * ```
 */
export function getChildCategories(canonicalId: string): CategoryMapping[] {
  return CATEGORY_MAPPINGS.filter(c => c.parentId === canonicalId);
}

/**
 * 获取分类树（包含所有后代）
 *
 * @param canonicalId - 规范分类ID
 * @returns 该分类及其所有后代的ID列表
 */
export function getCategoryTree(canonicalId: string): string[] {
  const tree = [canonicalId];
  const children = getChildCategories(canonicalId);

  children.forEach(child => {
    tree.push(...getCategoryTree(child.canonicalId));
  });

  return tree;
}
