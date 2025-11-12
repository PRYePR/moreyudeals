/**
 * 分类规范化映射配置
 *
 * 设计原则：
 * 1. 只使用一级分类（10个核心分类）
 * 2. 所有源站点分类都映射到这10个标准分类
 * 3. 多对一映射：源站点的细分类别都归入对应的大类
 * 4. 未映射的分类自动归入"其他"类别
 */

export interface CategoryMapping {
  /** 规范分类ID（用于URL和数据库） */
  canonicalId: string;
  /** 规范分类中文名称（前端显示） */
  canonicalName: string;
  /** 规范分类德文名称 */
  canonicalNameDe: string;
  /** 分类图标（emoji） */
  icon: string;
  /** 各站点的别名映射 */
  aliases: {
    [site: string]: string[];
  };
  /** 分类排序权重（数字越小越靠前） */
  weight: number;
}

/**
 * 标准分类列表（10个一级分类）
 */
export const CATEGORY_MAPPINGS: CategoryMapping[] = [
  // 1. 数码电子
  {
    canonicalId: 'electronics',
    canonicalName: '数码电子',
    canonicalNameDe: 'Elektronik',
    icon: '📱',
    weight: 10,
    aliases: {
      preisjaeger: [
        'Elektronik',
        'electronics',
        'Computer & Büro',
        'computer',
        'Smartphones & Zubehör',
        'smartphones',
        'smartphone',
        'handy',
        'Tablets & eReader',
        'tablets',
        'tablet',
        'Laptops & Notebooks',
        'laptop',
        'notebooks',
        'PC & Komponenten',
        'pc',
        'komponenten',
        'Audio & HiFi',
        'audio',
        'hifi',
        'Kopfhörer',
        'kopfhoerer',
        'headphones',
        'TV & Heimkino',
        'tv',
        'heimkino',
        'Fernseher',
        'fernseher',
        'Foto & Video',
        'foto',
        'video',
        'kamera',
        'Kameras',
        'Drohnen & Zubehör',
        'drohnen',
        'drohne',
        'Wearables & Fitness-Tracker',
        'wearables',
        'fitness-tracker',
        'smartwatch',
        'Smart Home',
        'smarthome',
        'Netzwerk & WLAN',
        'netzwerk',
        'wlan',
        'router',
        'Software & Spiele',
        'software',
        'Zubehör & Peripherie',
        'zubehoer',
        'peripherie',
        'Elektronik & Computer',
      ],
      sparhamster: [
        '电子',
        '数码',
        '电子产品',
        '数码产品',
        '手机',
        '电脑',
        '平板',
        '笔记本',
        '相机',
        '耳机',
        '音响',
        '电视',
      ]
    }
  },

  // 2. 家用电器
  {
    canonicalId: 'appliances',
    canonicalName: '家用电器',
    canonicalNameDe: 'Haushaltsgeräte',
    icon: '🏠',
    weight: 20,
    aliases: {
      preisjaeger: [
        'Haushaltsgeräte',
        'haushaltsgeraete',
        'appliances',
        'Haushalts- & Küchengeräte',
        'haushalt',
        'Küchengeräte',
        'kuechengeraete',
        'kitchen',
        'Kaffeemaschinen',
        'kaffeemaschine',
        'kaffee',
        'coffee',
        'Staubsauger & Reinigung',
        'staubsauger',
        'reinigung',
        'vacuum',
        'Waschmaschinen & Trockner',
        'waschmaschine',
        'trockner',
        'washing',
        'Kühlschränke & Gefriergeräte',
        'kuehlschrank',
        'gefrierschrank',
        'fridge',
        'Klimageräte & Heizungen',
        'klima',
        'heizung',
        'heating',
        'Körperpflege-Geräte',
        'koerperpflege',
        'personal care',
      ],
      sparhamster: [
        '家电',
        '电器',
        '家用电器',
        '厨房电器',
        '咖啡机',
        '吸尘器',
        '洗衣机',
        '冰箱',
      ]
    }
  },

  // 3. 时尚服饰
  {
    canonicalId: 'fashion',
    canonicalName: '时尚服饰',
    canonicalNameDe: 'Mode & Accessoires',
    icon: '👔',
    weight: 30,
    aliases: {
      preisjaeger: [
        'Mode & Accessoires',
        'mode',
        'accessoires',
        'fashion',
        'Kleidung',
        'kleidung',
        'clothing',
        'Schuhe',
        'schuhe',
        'shoes',
        'Herrenmode',
        'herren',
        'men',
        'Damenmode',
        'damen',
        'women',
        'Kindermode',
        'kinder',
        'kids fashion',
        'Taschen & Gepäck',
        'taschen',
        'gepaeck',
        'bags',
        'Uhren & Schmuck',
        'uhren',
        'schmuck',
        'watches',
        'jewelry',
        'Sportbekleidung',
        'sportbekleidung',
        'sportswear',
      ],
      sparhamster: [
        '时尚',
        '服装',
        '服饰',
        '鞋',
        '鞋子',
        '包',
        '箱包',
        '手表',
        '首饰',
        '配饰',
      ]
    }
  },

  // 4. 美妆个护
  {
    canonicalId: 'beauty',
    canonicalName: '美妆个护',
    canonicalNameDe: 'Beauty & Gesundheit',
    icon: '💄',
    weight: 40,
    aliases: {
      preisjaeger: [
        'Beauty & Gesundheit',
        'beauty',
        'gesundheit',
        'health',
        'Kosmetik & Pflege',
        'kosmetik',
        'pflege',
        'cosmetics',
        'Parfüm & Düfte',
        'parfuem',
        'duft',
        'perfume',
        'Hautpflege',
        'hautpflege',
        'skincare',
        'Haarpflege',
        'haarpflege',
        'haircare',
        'Make-up',
        'makeup',
        'Nahrungsergänzung',
        'nahrungsergaenzung',
        'supplements',
        'Apotheke & Gesundheit',
        'apotheke',
        'pharmacy',
      ],
      sparhamster: [
        '美容',
        '美妆',
        '化妆品',
        '护肤',
        '个护',
        '健康',
        '保健',
      ]
    }
  },

  // 5. 食品饮料
  {
    canonicalId: 'food',
    canonicalName: '食品饮料',
    canonicalNameDe: 'Lebensmittel & Getränke',
    icon: '🍔',
    weight: 50,
    aliases: {
      preisjaeger: [
        'Lebensmittel & Getränke',
        'lebensmittel',
        'getraenke',
        'food',
        'drinks',
        'Essen & Trinken',
        'essen',
        'trinken',
        'Süßwaren & Snacks',
        'suesswaren',
        'snacks',
        'sweets',
        'Getränke',
        'beverages',
        'Kaffee & Tee',
        'tee',
        'tea',
        'Bio & Vegan',
        'bio',
        'vegan',
        'organic',
        'Alkoholische Getränke',
        'alkohol',
        'wein',
        'bier',
        'wine',
        'beer',
        'Lebensmittel & Haushalt',
      ],
      sparhamster: [
        '食品',
        '食物',
        '饮料',
        '零食',
        '咖啡',
        '茶',
      ]
    }
  },

  // 6. 运动户外
  {
    canonicalId: 'sports',
    canonicalName: '运动户外',
    canonicalNameDe: 'Sport & Outdoor',
    icon: '⚽',
    weight: 60,
    aliases: {
      preisjaeger: [
        'Sport & Outdoor',
        'sport',
        'outdoor',
        'Sportartikel',
        'sportartikel',
        'sports',
        'Fitness & Gym',
        'fitness',
        'gym',
        'Fahrräder & E-Bikes',
        'fahrrad',
        'fahrraeder',
        'e-bike',
        'bike',
        'Camping & Outdoor',
        'camping',
        'Angeln & Jagd',
        'angeln',
        'jagd',
        'fishing',
        'Wintersport',
        'wintersport',
        'ski',
        'Wassersport',
        'wassersport',
        'water sports',
      ],
      sparhamster: [
        '运动',
        '户外',
        '健身',
        '自行车',
        '露营',
      ]
    }
  },

  // 7. 母婴玩具
  {
    canonicalId: 'family-kids',
    canonicalName: '母婴玩具',
    canonicalNameDe: 'Familie & Kinder',
    icon: '👶',
    weight: 70,
    aliases: {
      preisjaeger: [
        'Familie & Kinder',
        'familie',
        'kinder',
        'family',
        'kids',
        'Baby & Kind',
        'baby',
        'Spielzeug',
        'spielzeug',
        'toys',
        'LEGO & Bausteine',
        'lego',
        'bausteine',
        'building',
        'Babypflege',
        'babypflege',
        'baby care',
        'Kinderwagen & Buggys',
        'kinderwagen',
        'buggy',
        'stroller',
        'Windeln & Feuchttücher',
        'windeln',
        'feuchttuecher',
        'diapers',
        'Bücher & Spiele',
        'buecher',
        'spiele',
        'books',
        'games',
        'blumen',
        'dekoration',
        'deko',
      ],
      sparhamster: [
        '母婴',
        '玩具',
        '儿童',
        '婴儿',
        '宝宝',
        '乐高',
      ]
    }
  },

  // 8. 家居生活
  {
    canonicalId: 'home',
    canonicalName: '家居生活',
    canonicalNameDe: 'Wohnen & Garten',
    icon: '🛋️',
    weight: 80,
    aliases: {
      preisjaeger: [
        'Wohnen & Garten',
        'wohnen',
        'garten',
        'home',
        'garden',
        'Möbel',
        'moebel',
        'furniture',
        'Heimtextilien',
        'heimtextilien',
        'textiles',
        'Dekoration',
        'decoration',
        'Beleuchtung',
        'beleuchtung',
        'lighting',
        'Gartenmöbel & Zubehör',
        'gartenmoebel',
        'Werkzeug & Heimwerken',
        'werkzeug',
        'heimwerken',
        'tools',
        'diy',
        'Baumarkt',
        'baumarkt',
        'hardware',
        'Haushaltswaren',
        'haushaltswaren',
        'household',
        'Küche & Haushalt',
        'kueche',
      ],
      sparhamster: [
        '家居',
        '家具',
        '装饰',
        '花园',
        '工具',
        '家用',
        '家庭',
      ]
    }
  },

  // 9. 汽车用品
  {
    canonicalId: 'auto',
    canonicalName: '汽车用品',
    canonicalNameDe: 'Auto & Motorrad',
    icon: '🚗',
    weight: 90,
    aliases: {
      preisjaeger: [
        'Auto & Motorrad',
        'auto',
        'motorrad',
        'car',
        'motorcycle',
        'Autozubehör',
        'autozubehoer',
        'car accessories',
        'Reifen & Felgen',
        'reifen',
        'felgen',
        'tires',
        'Motorradbekleidung',
        'motorradbekleidung',
        'motorcycle gear',
        'Navigation & Elektronik',
        'navigation',
        'GPS',
        'Pflege & Wartung',
        'wartung',
        'maintenance',
      ],
      sparhamster: [
        '汽车',
        '车',
        '摩托车',
        '车用',
        '汽配',
      ]
    }
  },

  // 10. 休闲娱乐
  {
    canonicalId: 'entertainment',
    canonicalName: '休闲娱乐',
    canonicalNameDe: 'Freizeit & Unterhaltung',
    icon: '🎮',
    weight: 100,
    aliases: {
      preisjaeger: [
        'Freizeit & Unterhaltung',
        'freizeit',
        'unterhaltung',
        'entertainment',
        'leisure',
        'Gaming',
        'gaming',
        'Konsolen & Spiele',
        'konsolen',
        'console',
        'PlayStation',
        'playstation',
        'Xbox',
        'xbox',
        'Nintendo',
        'nintendo',
        'PC-Spiele',
        'pc-spiele',
        'pc games',
        'Musik & Filme',
        'musik',
        'filme',
        'music',
        'movies',
        'Bücher & Zeitschriften',
        'zeitschriften',
        'magazines',
        'Hobbys & Sammeln',
        'hobby',
        'sammeln',
        'collecting',
        'Reisen & Urlaub',
        'reisen',
        'urlaub',
        'travel',
        'vacation',
        'Tickets & Events',
        'tickets',
        'events',
        'Gutscheine',
        'gutscheine',
        'vouchers',
        'Filme, Bücher & Musik',
        'Kultur & Freizeit',
        'kultur',
      ],
      sparhamster: [
        '游戏',
        '娱乐',
        '休闲',
        '音乐',
        '电影',
        '图书',
        '旅游',
        '门票',
      ]
    }
  },

  // 11. 其他（兜底分类）
  {
    canonicalId: 'other',
    canonicalName: '其他',
    canonicalNameDe: 'Sonstiges',
    icon: '📦',
    weight: 999,
    aliases: {
      preisjaeger: [
        'Sonstiges',
        'sonstiges',
        'other',
        'Dienstleistungen',
        'dienstleistungen',
        'services',
        'Versicherungen',
        'versicherungen',
        'insurance',
        'Finanzen & Verträge',
        'finanzen',
        'vertraege',
        'finance',
        'contracts',
        'Telefon & Internet',
        'telefon',
        'internet',
        'Strom & Gas',
        'strom',
        'gas',
        'energy',
        'Verschiedenes',
        'verschiedenes',
        'miscellaneous',
      ],
      sparhamster: [
        '其他',
        '服务',
        '金融',
        '保险',
      ]
    }
  },
];

/**
 * 获取所有标准分类（按权重排序）
 */
export function getAllCategories(): CategoryMapping[] {
  return CATEGORY_MAPPINGS.sort((a, b) => a.weight - b.weight);
}

/**
 * 根据canonicalId查找分类
 */
export function getCategoryById(id: string): CategoryMapping | undefined {
  return CATEGORY_MAPPINGS.find(c => c.canonicalId === id);
}

/**
 * 根据canonicalName查找分类
 */
export function getCategoryByName(name: string): CategoryMapping | undefined {
  return CATEGORY_MAPPINGS.find(c => c.canonicalName === name);
}
