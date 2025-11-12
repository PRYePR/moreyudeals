/**
 * 分类规范化映射配置
 *
 * 基于 Preisjaeger 分类体系建立的统一分类映射
 * Preisjaeger 的分类更完善、更准确，作为主要参考源
 *
 * 配置说明:
 * - canonicalId: 规范分类ID (用于URL和API, 建议使用小写英文)
 * - canonicalName: 规范分类中文名称 (前端展示用)
 * - canonicalNameDe: 规范分类德文名称 (德语市场展示用)
 * - aliases: 别名映射对象，按站点组织不同写法
 * - sites: 记录该分类在哪些站点出现过
 */

export interface CategoryMapping {
  canonicalId: string;
  canonicalName: string;
  canonicalNameDe: string;
  aliases: {
    [site: string]: string[];  // 站点名 -> 该站点的别名列表
  };
  sites: string[];
  parentId?: string;  // 可选的父分类ID，用于建立层级关系
}

/**
 * 分类映射配置列表
 *
 * 添加新分类时的步骤:
 * 1. 添加新的 CategoryMapping 对象
 * 2. 在 aliases 中为每个站点添加可能的写法（大小写不敏感）
 * 3. 更新 sites 记录该分类出现的站点
 * 4. 如有父子关系，设置 parentId
 */
export const CATEGORY_MAPPINGS: CategoryMapping[] = [
  // 电子产品 / Electronics
  {
    canonicalId: 'electronics',
    canonicalName: '电子产品',
    canonicalNameDe: 'Elektronik',
    aliases: {
      preisjaeger: ['Elektronik', 'elektronik'],
      sparhamster: ['elektronik', '电子', '电子产品']
    },
    sites: ['preisjaeger', 'sparhamster']
  },

  // 家居与生活 / Home & Living
  {
    canonicalId: 'home-living',
    canonicalName: '家居生活',
    canonicalNameDe: 'Home & Living',
    aliases: {
      preisjaeger: ['Home & Living', 'home & living', 'home and living'],
      sparhamster: ['家居', '家居生活', '生活用品']
    },
    sites: ['preisjaeger', 'sparhamster']
  },

  // 食品与家居用品 / Food & Household
  {
    canonicalId: 'food-household',
    canonicalName: '食品家居',
    canonicalNameDe: 'Lebensmittel & Haushalt',
    aliases: {
      preisjaeger: ['Lebensmittel & Haushalt', 'lebensmittel & haushalt', 'lebensmittel'],
      sparhamster: ['食品', '家用', '日用品', '食品家居']
    },
    sites: ['preisjaeger', 'sparhamster']
  },

  // 时尚与配饰 / Fashion & Accessories
  {
    canonicalId: 'fashion',
    canonicalName: '时尚配饰',
    canonicalNameDe: 'Fashion & Accessories',
    aliases: {
      preisjaeger: ['Fashion & Accessories', 'fashion & accessories', 'mode & accessoires'],
      sparhamster: ['时尚', '服装', '配饰', '服饰']
    },
    sites: ['preisjaeger', 'sparhamster']
  },

  // 美容与健康 / Beauty & Health
  {
    canonicalId: 'beauty-health',
    canonicalName: '美容健康',
    canonicalNameDe: 'Beauty & Gesundheit',
    aliases: {
      preisjaeger: ['Beauty & Gesundheit', 'beauty & gesundheit', 'beauty', 'gesundheit'],
      sparhamster: ['美容', '健康', '美妆', '护肤']
    },
    sites: ['preisjaeger', 'sparhamster']
  },

  // 运动与户外 / Sports & Outdoor
  {
    canonicalId: 'sports-outdoor',
    canonicalName: '运动户外',
    canonicalNameDe: 'Sport & Outdoor',
    aliases: {
      preisjaeger: ['Sport & Outdoor', 'sport & outdoor', 'sport', 'outdoor'],
      sparhamster: ['运动', '户外', '体育']
    },
    sites: ['preisjaeger', 'sparhamster']
  },

  // 游戏 / Gaming
  {
    canonicalId: 'gaming',
    canonicalName: '游戏',
    canonicalNameDe: 'Gaming',
    aliases: {
      preisjaeger: ['Gaming', 'gaming', 'videospiele'],
      sparhamster: ['游戏', '电玩', 'gaming']
    },
    sites: ['preisjaeger', 'sparhamster']
  },

  // 家庭与儿童 / Family & Kids
  {
    canonicalId: 'family-kids',
    canonicalName: '家庭儿童',
    canonicalNameDe: 'Family & Kids',
    aliases: {
      preisjaeger: ['Family & Kids', 'family & kids', 'familie & kinder'],
      sparhamster: ['儿童', '家庭', '亲子', '母婴']
    },
    sites: ['preisjaeger', 'sparhamster']
  },

  // 旅行 / Travel
  {
    canonicalId: 'travel',
    canonicalName: '旅行',
    canonicalNameDe: 'Reisen',
    aliases: {
      preisjaeger: ['Reisen', 'reisen', 'travel'],
      sparhamster: ['旅行', '旅游', '出行']
    },
    sites: ['preisjaeger', 'sparhamster']
  },

  // 文化与休闲 / Culture & Leisure
  {
    canonicalId: 'culture-leisure',
    canonicalName: '文化休闲',
    canonicalNameDe: 'Kultur & Freizeit',
    aliases: {
      preisjaeger: ['Kultur & Freizeit', 'kultur & freizeit', 'kultur', 'freizeit'],
      sparhamster: ['文化', '休闲', '娱乐', '兴趣']
    },
    sites: ['preisjaeger', 'sparhamster']
  },

  // 汽车与摩托 / Auto & Motorcycle
  {
    canonicalId: 'auto-motorcycle',
    canonicalName: '汽车摩托',
    canonicalNameDe: 'Auto & Motorrad',
    aliases: {
      preisjaeger: ['Auto & Motorrad', 'auto & motorrad', 'auto', 'motorrad'],
      sparhamster: ['汽车', '摩托', '车辆']
    },
    sites: ['preisjaeger', 'sparhamster']
  },

  // 花园与建材 / Garden & DIY
  {
    canonicalId: 'garden-diy',
    canonicalName: '花园建材',
    canonicalNameDe: 'Garten & Baumarkt',
    aliases: {
      preisjaeger: ['Garten & Baumarkt', 'garten & baumarkt', 'garten', 'baumarkt'],
      sparhamster: ['花园', '建材', '园艺', '装修']
    },
    sites: ['preisjaeger', 'sparhamster']
  },

  // 电话与网络 / Phone & Internet
  {
    canonicalId: 'phone-internet',
    canonicalName: '电话网络',
    canonicalNameDe: 'Telefon & Internet',
    aliases: {
      preisjaeger: ['Telefon & Internet', 'telefon & internet', 'telefon', 'internet'],
      sparhamster: ['电话', '网络', '通讯', '宽带']
    },
    sites: ['preisjaeger', 'sparhamster']
  },

  // 服务与合同 / Services & Contracts
  {
    canonicalId: 'services-contracts',
    canonicalName: '服务合同',
    canonicalNameDe: 'Dienstleistungen & Verträge',
    aliases: {
      preisjaeger: ['Dienstleistungen & Verträge', 'dienstleistungen & verträge', 'dienstleistungen', 'verträge'],
      sparhamster: ['服务', '合同', '订阅']
    },
    sites: ['preisjaeger', 'sparhamster']
  },

  // 保险与金融 / Insurance & Finance
  {
    canonicalId: 'insurance-finance',
    canonicalName: '保险金融',
    canonicalNameDe: 'Versicherung & Finanzen',
    aliases: {
      preisjaeger: ['Versicherung & Finanzen', 'versicherung & finanzen', 'versicherung', 'finanzen'],
      sparhamster: ['保险', '金融', '理财']
    },
    sites: ['preisjaeger', 'sparhamster']
  },

  // ============ 子分类示例 ============
  // 可根据需要添加更细分的分类

  // 家用电器 (Home & Living 的子类)
  {
    canonicalId: 'home-appliances',
    canonicalName: '家用电器',
    canonicalNameDe: 'Haushaltsgeräte',
    aliases: {
      preisjaeger: ['Haushaltsgeräte', 'haushaltsgeräte'],
      sparhamster: ['家电', '电器']
    },
    sites: ['preisjaeger', 'sparhamster'],
    parentId: 'home-living'
  },

  // 咖啡机 (Home Appliances 的子类)
  {
    canonicalId: 'coffee-machines',
    canonicalName: '咖啡机',
    canonicalNameDe: 'Kaffeemaschinen',
    aliases: {
      preisjaeger: ['Kaffeemaschinen', 'kaffeemaschinen'],
      sparhamster: ['咖啡机']
    },
    sites: ['preisjaeger', 'sparhamster'],
    parentId: 'home-appliances'
  },

  // 厨房与烹饪 (Home & Living 的子类)
  {
    canonicalId: 'kitchen-cooking',
    canonicalName: '厨房烹饪',
    canonicalNameDe: 'Küche & Kochen',
    aliases: {
      preisjaeger: ['Küche & Kochen', 'küche & kochen', 'küche', 'kochen'],
      sparhamster: ['厨房', '烹饪', '厨具']
    },
    sites: ['preisjaeger', 'sparhamster'],
    parentId: 'home-living'
  },

  // 办公用品 (可归属于 Home & Living 或独立)
  {
    canonicalId: 'office-supplies',
    canonicalName: '办公用品',
    canonicalNameDe: 'Bürobedarf',
    aliases: {
      preisjaeger: ['Bürobedarf', 'bürobedarf'],
      sparhamster: ['办公', '文具', '办公用品']
    },
    sites: ['preisjaeger', 'sparhamster'],
    parentId: 'home-living'
  }
];

/**
 * 分类规范化统计信息
 * 用于记录未匹配的分类名称，便于后续补充配置
 */
export interface CategoryNormalizationStats {
  totalProcessed: number;
  matched: number;
  unmatched: number;
  unmatchedCategories: Map<string, number>; // 分类名 -> 出现次数
}

/**
 * 创建空的分类规范化统计
 */
export function createCategoryNormalizationStats(): CategoryNormalizationStats {
  return {
    totalProcessed: 0,
    matched: 0,
    unmatched: 0,
    unmatchedCategories: new Map()
  };
}

/**
 * 记录未匹配的分类名称
 */
export function recordUnmatchedCategory(
  stats: CategoryNormalizationStats,
  categoryName: string
): void {
  const count = stats.unmatchedCategories.get(categoryName) || 0;
  stats.unmatchedCategories.set(categoryName, count + 1);
}

/**
 * 获取未匹配分类的统计报告
 */
export function getUnmatchedCategoryReport(stats: CategoryNormalizationStats): string {
  if (stats.unmatchedCategories.size === 0) {
    return '所有分类都已匹配规范名称';
  }

  const sorted = Array.from(stats.unmatchedCategories.entries())
    .sort((a, b) => b[1] - a[1]);

  let report = `\n未匹配的分类统计 (共 ${stats.unmatchedCategories.size} 个):\n`;
  report += '分类名称'.padEnd(30) + '出现次数\n';
  report += '-'.repeat(40) + '\n';

  sorted.forEach(([name, count]) => {
    report += `${name.padEnd(30)} ${count}\n`;
  });

  return report;
}
