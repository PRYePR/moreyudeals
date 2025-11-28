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
  // 亚马逊德国站 (主要市场) - 统一所有Amazon变体
  {
    canonicalId: 'amazon-de',
    canonicalName: 'Amazon.de',
    aliases: [
      'amazon',
      'amazon.de',
      'amazon de',
      'amazon.at',
      'amazon at',
      'amazon.com',
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
      'billa plus',
      'shop.billa.at'
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

  // 优惠券和折扣平台
  {
    canonicalId: 'marktguru',
    canonicalName: 'Marktguru',
    aliases: [
      'marktguru',
      'markt guru',
      'marktguru.at',
      'marktguru at'
    ],
    sites: ['preisjaeger', 'sparhamster'],
    website: 'https://www.marktguru.at'
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
  },

  // 线上零售商
  {
    canonicalId: 'getgoods',
    canonicalName: 'getgoods',
    aliases: [
      'getgoods',
      'getgoods.com',
      'getgoods.de'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.getgoods.com'
  },

  {
    canonicalId: 'about-you',
    canonicalName: 'ABOUT YOU',
    aliases: [
      'about you',
      'aboutyou',
      'about-you',
      'aboutyou.at',
      'aboutyou.de'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.aboutyou.at'
  },

  // 运动和户外
  {
    canonicalId: 'sportspar',
    canonicalName: 'SportSpar',
    aliases: [
      'sportspar',
      'sport spar',
      'sportspar.de',
      'sportspar.at'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.sportspar.de'
  },

  // 厨房电器
  {
    canonicalId: 'ninja-kitchen',
    canonicalName: 'Ninja Kitchen',
    aliases: [
      'ninja',
      'ninja kitchen',
      'ninja-kitchen',
      'ninjakitchen',
      'ninjakitchen.de'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.ninjakitchen.de'
  },

  {
    canonicalId: 'gastroback',
    canonicalName: 'Gastroback',
    aliases: [
      'gastroback',
      'gastroback.de'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.gastroback.de'
  },

  // 书籍和媒体
  {
    canonicalId: 'thalia',
    canonicalName: 'Thalia',
    aliases: [
      'thalia',
      'thalia.at',
      'thalia.de'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.thalia.at'
  },

  // 美容护理
  {
    canonicalId: 'yves-rocher',
    canonicalName: 'Yves Rocher',
    aliases: [
      'yves rocher',
      'yves-rocher',
      'yvesrocher',
      'yves-rocher.at',
      'yves-rocher.de'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.yves-rocher.at'
  },

  // 宠物用品
  {
    canonicalId: 'zooplus',
    canonicalName: 'Zooplus',
    aliases: [
      'zooplus',
      'zooplus.at',
      'zooplus.de',
      'zooplus at'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.zooplus.at'
  },

  // 票务
  {
    canonicalId: 'oeticket',
    canonicalName: 'oeticket',
    aliases: [
      'oeticket',
      'ö-ticket',
      'oeticket.com'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.oeticket.com'
  },

  // 通信
  {
    canonicalId: 'lidl-connect',
    canonicalName: 'Lidl Connect',
    aliases: [
      'lidl connect',
      'lidl-connect',
      'lidlconnect'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.lidl-connect.at'
  },

  // 游戏平台
  {
    canonicalId: 'indiegala',
    canonicalName: 'IndieGala',
    aliases: [
      'indiegala',
      'indie gala',
      'indiegala.com'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.indiegala.com'
  },

  // 食品配送
  {
    canonicalId: 'hellofresh',
    canonicalName: 'HelloFresh',
    aliases: [
      'hellofresh',
      'hello fresh',
      'hellofresh.at',
      'hellofresh.de'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.hellofresh.at'
  },

  // 科技品牌
  {
    canonicalId: 'google',
    canonicalName: 'Google Store',
    aliases: [
      'google',
      'google store',
      'google-store',
      'store.google.com'
    ],
    sites: ['preisjaeger'],
    website: 'https://store.google.com'
  },

  // 机器人/3D打印
  {
    canonicalId: 'snapmaker',
    canonicalName: 'Snapmaker',
    aliases: [
      'snapmaker',
      'snapmaker.com',
      'eu.snapmaker.com'
    ],
    sites: ['preisjaeger'],
    website: 'https://eu.snapmaker.com'
  },

  // A1 奥地利电信
  {
    canonicalId: 'a1-telekom',
    canonicalName: 'A1',
    aliases: [
      'a1',
      'a1 telekom',
      'a1.net'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.a1.net'
  },

  // Adidas 运动品牌
  {
    canonicalId: 'adidas',
    canonicalName: 'adidas',
    aliases: [
      'adidas',
      'adidas.at',
      'adidas.de'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.adidas.at'
  },

  // Alternate 电脑硬件
  {
    canonicalId: 'alternate',
    canonicalName: 'Alternate',
    aliases: [
      'alternate',
      'alternate.at',
      'alternate.de'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.alternate.at'
  },

  // Audible 有声读物
  {
    canonicalId: 'audible',
    canonicalName: 'Audible',
    aliases: [
      'audible',
      'audible.de',
      'audible.at'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.audible.de'
  },

  // Baby-Markt 婴儿用品
  {
    canonicalId: 'baby-markt',
    canonicalName: 'Baby-Markt',
    aliases: [
      'baby-markt',
      'baby markt',
      'babymarkt',
      'babymarkt.de'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.baby-markt.at'
  },

  // Babywalz 婴儿用品
  {
    canonicalId: 'babywalz',
    canonicalName: 'babywalz',
    aliases: [
      'babywalz',
      'babywalz.at',
      'babywalz.de'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.babywalz.at'
  },

  // BIPA 药妆店
  {
    canonicalId: 'bipa',
    canonicalName: 'BIPA',
    aliases: [
      'bipa',
      'bipa.at'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.bipa.at'
  },

  // Biogena 保健品
  {
    canonicalId: 'biogena',
    canonicalName: 'Biogena',
    aliases: [
      'biogena',
      'biogena.com'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.biogena.com'
  },

  // Blinkist 阅读应用
  {
    canonicalId: 'blinkist',
    canonicalName: 'Blinkist',
    aliases: [
      'blinkist',
      'blinkist.com'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.blinkist.com'
  },

  // Bonprix 时尚零售
  {
    canonicalId: 'bonprix',
    canonicalName: 'bonprix',
    aliases: [
      'bonprix',
      'bonprix.at',
      'bonprix.de'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.bonprix.at'
  },

  // Burger King 快餐
  {
    canonicalId: 'burger-king',
    canonicalName: 'Burger King',
    aliases: [
      'burger king',
      'burgerking',
      'bk'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.burgerking.at'
  },

  // Computeruniverse 电脑硬件
  {
    canonicalId: 'computeruniverse',
    canonicalName: 'Computeruniverse',
    aliases: [
      'computeruniverse',
      'computeruniverse.net'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.computeruniverse.net'
  },

  // Cyberport 电子产品
  {
    canonicalId: 'cyberport',
    canonicalName: 'Cyberport',
    aliases: [
      'cyberport',
      'cyberport.de'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.cyberport.de'
  },

  // DJI 无人机
  {
    canonicalId: 'dji',
    canonicalName: 'DJI',
    aliases: [
      'dji',
      'dji.com'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.dji.com'
  },

  // Disney Shop 迪士尼商店
  {
    canonicalId: 'disney-shop',
    canonicalName: 'Disney Shop',
    aliases: [
      'disney shop',
      'disney-shop',
      'disneystore'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.shopdisney.de'
  },

  // Drei 奥地利电信
  {
    canonicalId: 'drei',
    canonicalName: 'Drei',
    aliases: [
      'drei',
      'drei.at',
      '3'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.drei.at'
  },

  // Dyson 家电
  {
    canonicalId: 'dyson',
    canonicalName: 'Dyson',
    aliases: [
      'dyson',
      'dyson onlineshop',
      'dyson.at',
      'dyson.de'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.dyson.at'
  },

  // Electronic4you 电子产品
  {
    canonicalId: 'electronic4you',
    canonicalName: 'Electronic4you',
    aliases: [
      'electronic4you',
      'electronic 4 you'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.electronic4you.at'
  },

  // EMP 音乐周边
  {
    canonicalId: 'emp',
    canonicalName: 'EMP',
    aliases: [
      'emp',
      'emp.at',
      'emp.de'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.emp.at'
  },

  // Epic Games 游戏平台
  {
    canonicalId: 'epic-games',
    canonicalName: 'Epic Games',
    aliases: [
      'epicgames',
      'epic games',
      'epic-games'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.epicgames.com'
  },

  // Fielmann 眼镜
  {
    canonicalId: 'fielmann',
    canonicalName: 'Fielmann',
    aliases: [
      'fielmann',
      'fielmann.at',
      'fielmann.de'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.fielmann.at'
  },

  // Galaxus 电商平台
  {
    canonicalId: 'galaxus',
    canonicalName: 'Galaxus',
    aliases: [
      'galaxus',
      'galaxus.at',
      'galaxus.de'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.galaxus.at'
  },

  // Games2Game 游戏
  {
    canonicalId: 'games2game',
    canonicalName: 'Games2Game',
    aliases: [
      'games2game',
      'games 2 game'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.mmoga.de'
  },

  // Hervis 运动用品
  {
    canonicalId: 'hervis',
    canonicalName: 'Hervis',
    aliases: [
      'hervis',
      'hervis.at'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.hervis.at'
  },

  // hessnatur 生态时尚
  {
    canonicalId: 'hessnatur',
    canonicalName: 'hessnatur',
    aliases: [
      'hessnatur',
      'hessnatur.com'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.hessnatur.com'
  },

  // Humanic 鞋类
  {
    canonicalId: 'humanic',
    canonicalName: 'Humanic',
    aliases: [
      'humanic',
      'humanic.net'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.humanic.net'
  },

  // Hunkemöller 内衣
  {
    canonicalId: 'hunkemoeller',
    canonicalName: 'Hunkemöller',
    aliases: [
      'hunkemöller',
      'hunkemoeller',
      'hunkemoller'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.hunkemoller.at'
  },

  // iBOOD 闪购平台
  {
    canonicalId: 'ibood',
    canonicalName: 'iBOOD',
    aliases: [
      'ibood',
      'ibood.at',
      'ibood.com'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.ibood.com'
  },

  // Lenovo 电脑
  {
    canonicalId: 'lenovo',
    canonicalName: 'Lenovo',
    aliases: [
      'lenovo',
      'lenovo.com'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.lenovo.com'
  },

  // Loaded 电子产品
  {
    canonicalId: 'loaded',
    canonicalName: 'Loaded',
    aliases: [
      'loaded',
      'loaded.at'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.loaded.at'
  },

  // Lottoland 彩票
  {
    canonicalId: 'lottoland',
    canonicalName: 'Lottoland',
    aliases: [
      'lottoland',
      'lottoland.at'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.lottoland.at'
  },

  // Magenta 电信
  {
    canonicalId: 'magenta',
    canonicalName: 'Magenta',
    aliases: [
      'magenta',
      'magenta.at',
      't-mobile'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.magenta.at'
  },

  // McDonald's 快餐
  {
    canonicalId: 'mcdonalds',
    canonicalName: "McDonald's",
    aliases: [
      'mcdonalds',
      "mcdonald's",
      'mc donalds'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.mcdonalds.at'
  },

  // Medimops 二手书
  {
    canonicalId: 'medimops',
    canonicalName: 'Medimops',
    aliases: [
      'medimops',
      'medimops.de'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.medimops.de'
  },

  // Melitta 咖啡机
  {
    canonicalId: 'melitta',
    canonicalName: 'Melitta',
    aliases: [
      'melitta',
      'melitta shop',
      'melitta-shop'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.melitta.at'
  },

  // Möbelix 家具
  {
    canonicalId: 'moebelix',
    canonicalName: 'Möbelix',
    aliases: [
      'möbelix',
      'moebelix',
      'moebelix.at'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.moebelix.at'
  },

  // mömax 家具
  {
    canonicalId: 'moemax',
    canonicalName: 'mömax',
    aliases: [
      'mömax',
      'moemax',
      'moemax.at'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.moemax.at'
  },

  // NKD 服装
  {
    canonicalId: 'nkd',
    canonicalName: 'NKD',
    aliases: [
      'nkd',
      'nkd.com'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.nkd.com'
  },

  // OBI 建材
  {
    canonicalId: 'obi',
    canonicalName: 'OBI',
    aliases: [
      'obi',
      'obi.at',
      'obi.de'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.obi.at'
  },

  // OTTO 电商
  {
    canonicalId: 'otto',
    canonicalName: 'OTTO',
    aliases: [
      'otto',
      'otto versand',
      'ottoversand',
      'otto.de'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.otto.de'
  },

  // Pagro 文具
  {
    canonicalId: 'pagro',
    canonicalName: 'Pagro',
    aliases: [
      'pagro',
      'pagro diskont',
      'pagro / libro',
      'pagro libro'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.pagro.at'
  },

  // Peek & Cloppenburg 时尚
  {
    canonicalId: 'peek-cloppenburg',
    canonicalName: 'Peek & Cloppenburg',
    aliases: [
      'peek und cloppenburg',
      'peek & cloppenburg',
      'p&c'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.peek-cloppenburg.at'
  },

  // Philips 电子产品
  {
    canonicalId: 'philips',
    canonicalName: 'Philips',
    aliases: [
      'philips',
      'philips.at',
      'philips.de'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.philips.at'
  },

  // PlayStation Store 游戏
  {
    canonicalId: 'playstation-store',
    canonicalName: 'PlayStation Store',
    aliases: [
      'playstation store',
      'playstation-store',
      'ps store',
      'psn'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://store.playstation.com'
  },

  // Readly 杂志订阅
  {
    canonicalId: 'readly',
    canonicalName: 'Readly',
    aliases: [
      'readly',
      'readly.com'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.readly.com'
  },

  // Seidensticker 衬衫
  {
    canonicalId: 'seidensticker',
    canonicalName: 'Seidensticker',
    aliases: [
      'seidensticker',
      'seidensticker.com'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.seidensticker.com'
  },

  // Shell 加油站
  {
    canonicalId: 'shell',
    canonicalName: 'Shell',
    aliases: [
      'shell',
      'shell.at'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.shell.at'
  },

  // s.Oliver 时尚
  {
    canonicalId: 'soliver',
    canonicalName: 's.Oliver',
    aliases: [
      'soliver',
      's.oliver',
      's oliver'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.soliver.at'
  },

  // SportScheck 运动用品
  {
    canonicalId: 'sportscheck',
    canonicalName: 'SportScheck',
    aliases: [
      'sportscheck',
      'sport scheck'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.sportscheck.com'
  },

  // Steam 游戏平台
  {
    canonicalId: 'steam',
    canonicalName: 'Steam',
    aliases: [
      'steam',
      'steampowered',
      'steam.com'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://store.steampowered.com'
  },

  // tipp3 博彩
  {
    canonicalId: 'tipp3',
    canonicalName: 'tipp3',
    aliases: [
      'tipp3',
      'tipp3.at'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.tipp3.at'
  },

  // Tom Tailor 时尚
  {
    canonicalId: 'tom-tailor',
    canonicalName: 'Tom Tailor',
    aliases: [
      'tom-tailor',
      'tom tailor',
      'tomtailor'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.tom-tailor.at'
  },

  // Ubisoft 游戏
  {
    canonicalId: 'ubisoft',
    canonicalName: 'Ubisoft Store',
    aliases: [
      'ubisoft',
      'ubisoft store',
      'ubisoft-store'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://store.ubi.com'
  },

  // Udemy 在线课程
  {
    canonicalId: 'udemy',
    canonicalName: 'Udemy',
    aliases: [
      'udemy',
      'udemy.com'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.udemy.com'
  },

  // Universal 通用商家
  {
    canonicalId: 'universal',
    canonicalName: 'Universal',
    aliases: [
      'universal'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.universal.at'
  },

  // win2day 博彩
  {
    canonicalId: 'win2day',
    canonicalName: 'win2day',
    aliases: [
      'win2day',
      'win2day.at'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.win2day.at'
  },

  // Zalando Lounge 闪购
  {
    canonicalId: 'zalando-lounge',
    canonicalName: 'Zalando Lounge',
    aliases: [
      'zalando-lounge',
      'zalando lounge',
      'zalandolounge'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.zalando-lounge.at'
  },

  // 0815 奥地利在线商店
  {
    canonicalId: '0815',
    canonicalName: '0815',
    aliases: [
      '0815',
      '0815.at'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.0815.at'
  },

  // Anycubic 3D打印机
  {
    canonicalId: 'anycubic',
    canonicalName: 'Anycubic',
    aliases: [
      'anycubic',
      'eu.anycubic.com',
      'anycubic.com'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.anycubic.com'
  },

  // Basler Beauty 美妆
  {
    canonicalId: 'basler-beauty',
    canonicalName: 'Basler Beauty',
    aliases: [
      'basler-beauty',
      'basler beauty',
      'www.basler-beauty.at',
      'basler-beauty.at'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.basler-beauty.at'
  },

  // Eduscho 咖啡
  {
    canonicalId: 'eduscho',
    canonicalName: 'Eduscho',
    aliases: [
      'eduscho',
      'eduscho.de'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.tchibo.de'
  },

  // Hagebau Nadlinger 建材
  {
    canonicalId: 'hagebau-nadlinger',
    canonicalName: 'Hagebau Nadlinger',
    aliases: [
      'hagebau nadlinger',
      'hagebau-nadlinger',
      'nadlinger'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.nadlinger.at'
  },

  // Issuu 数字出版平台
  {
    canonicalId: 'issuu',
    canonicalName: 'Issuu',
    aliases: [
      'issuu',
      'e.issuu.com',
      'issuu.com'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://issuu.com'
  },

  // LG Electronics 韩国电子品牌
  {
    canonicalId: 'lg',
    canonicalName: 'LG',
    aliases: [
      'lg',
      'www.lg.com',
      'lg.com',
      'lg electronics'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.lg.com/at'
  },

  // McFit 健身房
  {
    canonicalId: 'mcfit',
    canonicalName: 'McFit',
    aliases: [
      'mcfit',
      'www.mcfit.com',
      'mcfit.com'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.mcfit.com/at'
  },

  // Priority Pass 机场贵宾室
  {
    canonicalId: 'priority-pass',
    canonicalName: 'Priority Pass',
    aliases: [
      'priority pass',
      'priority-pass',
      'prioritypass',
      'join.prioritypass.com'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.prioritypass.com'
  },

  // Reisefux 旅游网站
  {
    canonicalId: 'reisefux',
    canonicalName: 'Reisefux',
    aliases: [
      'reisefux',
      'reisefux.at'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.reisefux.at'
  },

  // shöpping.at 购物网站
  {
    canonicalId: 'shoepping',
    canonicalName: 'shöpping.at',
    aliases: [
      'shöpping',
      'shöpping.at',
      'shoepping',
      'shoepping.at'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://www.xn--shpping-b1a.at'
  },

  // SK Rapid Fanshop 足球俱乐部商店
  {
    canonicalId: 'sk-rapid-fanshop',
    canonicalName: 'SK Rapid Fanshop',
    aliases: [
      'sk rapid fanshop',
      'sk rapid',
      'rapid fanshop',
      'sk-rapid-fanshop'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://fanshop.skrapid.at'
  },

  // we-are.travel 旅游网站
  {
    canonicalId: 'we-are-travel',
    canonicalName: 'we-are.travel',
    aliases: [
      'we-are.travel',
      'we are travel',
      'weare.travel'
    ],
    sites: ['sparhamster', 'preisjaeger'],
    website: 'https://we-are.travel'
  },

  // 通用商家（用于无法识别的品牌）
  {
    canonicalId: 'bob',
    canonicalName: 'Bob',
    aliases: [
      'bob'
    ],
    sites: ['preisjaeger'],
    website: 'https://www.bob.at'
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
