/**
 * 商家名称规范化映射配置
 *
 * 用于统一处理同一商家在不同站点、不同写法的情况
 *
 * 配置说明:
 * - canonicalId: 规范商家ID (用于URL和API, 建议使用小写英文)
 * - canonicalName: 规范商家显示名称 (前端展示用)
 * - aliases: 别名列表 (包含各种可能的写法, 不区分大小写)
 * - sites: 记录该商家在哪些站点出现过 (便于后续扩展)
 */

export interface MerchantMapping {
  canonicalId: string;
  canonicalName: string;
  aliases: string[];
  sites: string[];
  logo?: string;
  website?: string;
}

/**
 * 商家映射配置列表
 *
 * 添加新商家时的步骤:
 * 1. 添加新的 MerchantMapping 对象
 * 2. 确保 aliases 包含所有可能的写法 (大小写不敏感)
 * 3. 更新 sites 记录该商家出现的站点
 */
export const MERCHANT_MAPPINGS: MerchantMapping[] = [
  // 亚马逊德国站 (主要市场)
  {
    canonicalId: 'amazon-de',
    canonicalName: 'Amazon.de',
    aliases: [
      'amazon',
      'amazon.de',
      'amazon de',
      'amazon.at',
      'amazon at',
      'amazon germany',
      'amazon deutschland',
      'amazon austria',
      'amazon österreich'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.amazon.de'
  },

  // 奥地利电子产品零售商
  {
    canonicalId: 'mediamarkt',
    canonicalName: 'MediaMarkt',
    aliases: [
      'mediamarkt',
      'media markt',
      'media-markt',
      'mediamarkt.at',
      'mediamarkt at'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.mediamarkt.at'
  },

  {
    canonicalId: 'saturn',
    canonicalName: 'Saturn',
    aliases: [
      'saturn',
      'saturn.at',
      'saturn at'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.saturn.at'
  },

  // 欧洲电子产品零售商
  {
    canonicalId: 'alza',
    canonicalName: 'Alza',
    aliases: [
      'alza',
      'alza.at',
      'alza.de',
      'alza.cz',
      'alza at',
      'alza de'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.alza.at'
  },

  // 奥地利超市连锁
  {
    canonicalId: 'hofer',
    canonicalName: 'Hofer',
    aliases: [
      'hofer',
      'hofer.at',
      'hofer at',
      'aldi süd',
      'aldi sued'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.hofer.at'
  },

  {
    canonicalId: 'billa',
    canonicalName: 'Billa',
    aliases: [
      'billa',
      'billa.at',
      'billa at',
      'billa plus'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.billa.at'
  },

  {
    canonicalId: 'spar',
    canonicalName: 'Spar',
    aliases: [
      'spar',
      'spar.at',
      'spar at',
      'interspar',
      'eurospar'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.spar.at'
  },

  {
    canonicalId: 'lidl',
    canonicalName: 'Lidl',
    aliases: [
      'lidl',
      'lidl.at',
      'lidl at',
      'lidl österreich'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.lidl.at'
  },

  // 时尚与服装
  {
    canonicalId: 'zalando',
    canonicalName: 'Zalando',
    aliases: [
      'zalando',
      'zalando.at',
      'zalando at',
      'zalando lounge'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.zalando.at'
  },

  {
    canonicalId: 'hm',
    canonicalName: 'H&M',
    aliases: [
      'h&m',
      'h and m',
      'hm',
      'h&m.at',
      'hennes & mauritz'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.hm.com/at'
  },

  // 家居与家具
  {
    canonicalId: 'ikea',
    canonicalName: 'IKEA',
    aliases: [
      'ikea',
      'ikea.at',
      'ikea at',
      'ikea österreich'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.ikea.com/at'
  },

  {
    canonicalId: 'xxxlutz',
    canonicalName: 'XXXLutz',
    aliases: [
      'xxxlutz',
      'xxx lutz',
      'lutz',
      'xxxlutz.at'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.xxxlutz.at'
  },

  // 药妆与美容
  {
    canonicalId: 'dm',
    canonicalName: 'dm',
    aliases: [
      'dm',
      'dm.at',
      'dm at',
      'dm drogerie markt',
      'dm-drogerie markt'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.dm.at'
  },

  {
    canonicalId: 'mueller',
    canonicalName: 'Müller',
    aliases: [
      'müller',
      'mueller',
      'muller',
      'müller.at',
      'mueller.at'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.mueller.at'
  },

  // 运动用品
  {
    canonicalId: 'decathlon',
    canonicalName: 'Decathlon',
    aliases: [
      'decathlon',
      'decathlon.at',
      'decathlon at'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.decathlon.at'
  },

  {
    canonicalId: 'intersport',
    canonicalName: 'Intersport',
    aliases: [
      'intersport',
      'intersport.at',
      'intersport at'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.intersport.at'
  },

  // 在线市场
  {
    canonicalId: 'ebay',
    canonicalName: 'eBay',
    aliases: [
      'ebay',
      'ebay.at',
      'ebay at',
      'ebay austria'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.ebay.at'
  },

  {
    canonicalId: 'willhaben',
    canonicalName: 'willhaben',
    aliases: [
      'willhaben',
      'willhaben.at',
      'will haben'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.willhaben.at'
  },

  // 电子产品与配件
  {
    canonicalId: 'tink',
    canonicalName: 'tink',
    aliases: [
      'tink',
      'tink.de',
      'tink.at'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.tink.de'
  },

  {
    canonicalId: 'samsung',
    canonicalName: 'Samsung',
    aliases: [
      'samsung',
      'samsung.at',
      'samsung at',
      'samsung austria'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.samsung.com/at/'
  },

  // 国际电商
  {
    canonicalId: 'aliexpress',
    canonicalName: 'AliExpress',
    aliases: [
      'aliexpress',
      'ali express',
      'aliexpress.com'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.aliexpress.com'
  },

  {
    canonicalId: 'ebay-de',
    canonicalName: 'eBay.de',
    aliases: [
      'ebay de',
      'ebay.de',
      'ebay germany',
      'ebay deutschland'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.ebay.de'
  },

  // 运动健身
  {
    canonicalId: 'gymbeam',
    canonicalName: 'GymBeam',
    aliases: [
      'gymbeam',
      'gym beam',
      'gymbeam.at',
      'gymbeam.de'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.gymbeam.at'
  },

  {
    canonicalId: 'bergzeit',
    canonicalName: 'Bergzeit',
    aliases: [
      'bergzeit',
      'bergzeit.de',
      'bergzeit.at'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.bergzeit.de'
  },

  // 运动鞋类
  {
    canonicalId: '43einhalb',
    canonicalName: '43einhalb',
    aliases: [
      '43einhalb',
      '43 einhalb',
      '43einhalb.com'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.43einhalb.com'
  },

  {
    canonicalId: 'afew-store',
    canonicalName: 'AFEW Store',
    aliases: [
      'afew',
      'afew store',
      'afew-store',
      'afew-store.com'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.afew-store.com'
  },

  // 玩具
  {
    canonicalId: 'smyths-toys',
    canonicalName: 'Smyths Toys',
    aliases: [
      'smyths',
      'smyths toys',
      'smyths-toys',
      'smythstoys',
      'smyths.at'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.smythstoys.com/at'
  },

  // 家具家电
  {
    canonicalId: 'flexispot',
    canonicalName: 'FlexiSpot',
    aliases: [
      'flexispot',
      'flexi spot',
      'flexispot.de',
      'flexispot.at'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.flexispot.de'
  },

  {
    canonicalId: 'shark',
    canonicalName: 'Shark',
    aliases: [
      'shark',
      'shark.at',
      'sharkclean'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.sharkclean.at'
  },

  // 药妆补充
  {
    canonicalId: 'dm-drogerie',
    canonicalName: 'dm-drogerie markt',
    aliases: [
      'dm drogerie markt',
      'dm-drogerie markt',
      'dm drogeriemarkt',
      'drogerie markt'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.dm.at'
  }
];

/**
 * 规范化统计信息
 * 用于记录未匹配的商家名称，便于后续补充配置
 */
export interface NormalizationStats {
  totalProcessed: number;
  matched: number;
  unmatched: number;
  unmatchedNames: Map<string, number>; // 商家名 -> 出现次数
}

/**
 * 创建空的规范化统计
 */
export function createNormalizationStats(): NormalizationStats {
  return {
    totalProcessed: 0,
    matched: 0,
    unmatched: 0,
    unmatchedNames: new Map()
  };
}

/**
 * 记录未匹配的商家名称
 */
export function recordUnmatchedMerchant(stats: NormalizationStats, merchantName: string): void {
  const count = stats.unmatchedNames.get(merchantName) || 0;
  stats.unmatchedNames.set(merchantName, count + 1);
}

/**
 * 获取未匹配商家的统计报告
 */
export function getUnmatchedReport(stats: NormalizationStats): string {
  if (stats.unmatchedNames.size === 0) {
    return '所有商家都已匹配规范名称';
  }

  const sorted = Array.from(stats.unmatchedNames.entries())
    .sort((a, b) => b[1] - a[1]);

  let report = `\n未匹配的商家统计 (共 ${stats.unmatchedNames.size} 个):\n`;
  report += '商家名称'.padEnd(30) + '出现次数\n';
  report += '-'.repeat(40) + '\n';

  sorted.forEach(([name, count]) => {
    report += `${name.padEnd(30)} ${count}\n`;
  });

  return report;
}
