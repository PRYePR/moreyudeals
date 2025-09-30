import Parser from 'rss-parser'

export interface SparhamsterDeal {
  id: string
  title: string
  originalTitle: string
  translatedTitle: string
  description: string
  originalDescription: string
  translatedDescription: string
  price?: string
  originalPrice?: string
  currency: string
  discountPercentage?: number
  imageUrl: string
  dealUrl: string
  category: string
  source: string
  publishedAt: Date
  expiresAt: Date
  language: 'de' | 'en'
  translationProvider: 'deepl' | 'microsoft' | 'google'
  isTranslated: boolean
  categories: string[]
  content: string
}

interface RSSItem {
  title?: string
  link?: string
  pubDate?: string
  'content:encoded'?: string
  description?: string
  categories?: string[]
  guid?: string
}

export class SparhamsterFetcher {
  private parser: Parser<any, RSSItem>
  private rssUrl = 'https://www.sparhamster.at/feed/'

  constructor() {
    this.parser = new Parser({
      customFields: {
        item: [
          'content:encoded',
          ['media:content', 'media'],
        ]
      }
    })
  }

  async fetchLatestDeals(): Promise<SparhamsterDeal[]> {
    try {
      const feed = await this.parser.parseURL(this.rssUrl)
      const deals: SparhamsterDeal[] = []

      for (const item of feed.items.slice(0, 20)) { // 限制20个最新优惠
        const deal = await this.parseRSSItem(item)
        if (deal) {
          deals.push(deal)
        }
      }

      return deals
    } catch (error) {
      console.error('Error fetching Sparhamster deals:', error)
      return []
    }
  }

  private async parseRSSItem(item: RSSItem): Promise<SparhamsterDeal | null> {
    if (!item.title || !item.link) {
      return null
    }

    const originalTitle = item.title
    const originalDescription = this.cleanDescription(item.description || '')
    const content = item['content:encoded'] || item.description || ''

    // 提取价格信息
    const priceInfo = this.extractPriceInfo(originalTitle, content)

    // 提取图片 - 先尝试从内容中提取，如果没有则从dealUrl页面抓取
    let imageUrl = this.extractImageUrl(content)
    if (!imageUrl && item.link) {
      imageUrl = await this.extractImageFromDealPage(item.link)
    }
    if (!imageUrl) {
      imageUrl = this.getPlaceholderImage(item.categories)
    }

    // 生成过期时间（RSS中通常没有，我们设为30天后）
    const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date()
    const expiresAt = new Date(publishedAt.getTime() + 30 * 24 * 60 * 60 * 1000)

    // 始终翻译原始标题，翻译函数会处理价格文本
    const translatedTitle = await this.translateText(originalTitle)
    const translatedDescription = await this.translateText(originalDescription)

    return {
      id: this.generateId(item.link),
      // 修正：前端应该显示翻译后的标题
      title: translatedTitle,
      originalTitle,
      translatedTitle,
      description: translatedDescription, // 修正：前端应该显示翻译后的描述
      originalDescription,
      translatedDescription,
      price: priceInfo.currentPrice,
      originalPrice: priceInfo.originalPrice,
      currency: 'EUR',
      discountPercentage: priceInfo.discountPercentage,
      imageUrl,
      dealUrl: item.link,
      category: this.mapCategory(item.categories),
      source: 'Sparhamster.at',
      publishedAt,
      expiresAt,
      language: 'de',
      translationProvider: 'deepl',
      isTranslated: true,
      categories: item.categories || [],
      content: this.cleanHtml(content)
    }
  }

  private hasPriceInTitle(title: string): boolean {
    // 检查标题是否包含标准的价格格式 "um X € statt Y €"
    const pricePatterns = [
      /um\s+\d+(?:[.,]\d+)?\s*€\s+statt\s+\d+(?:[.,]\d+)?\s*€/i,
      /für\s+\d+(?:[.,]\d+)?\s*€\s+statt\s+\d+(?:[.,]\d+)?\s*€/i,
      /\d+(?:[.,]\d+)?\s*€\s+statt\s+\d+(?:[.,]\d+)?\s*€/i,
    ]

    return pricePatterns.some(pattern => pattern.test(title))
  }

  private extractPriceInfo(title: string, content: string): {
    currentPrice?: string
    originalPrice?: string
    discountPercentage?: number
  } {
    const text = title + ' ' + content

    // 匹配各种价格格式
    const pricePatterns = [
      // "10 € statt 21 €" 格式
      /(\d+(?:[.,]\d+)?)\s*€\s*statt\s*(\d+(?:[.,]\d+)?)\s*€/i,
      // "von 21€ auf 10€" 格式
      /von\s*(\d+(?:[.,]\d+)?)\s*€\s*auf\s*(\d+(?:[.,]\d+)?)\s*€/i,
      // "ursprünglich 21€, jetzt 10€" 格式
      /ursprünglich\s*(\d+(?:[.,]\d+)?)\s*€.*?jetzt\s*(\d+(?:[.,]\d+)?)\s*€/i,
      // "UVP: 21€, Preis: 10€" 格式
      /UVP:?\s*(\d+(?:[.,]\d+)?)\s*€.*?Preis:?\s*(\d+(?:[.,]\d+)?)\s*€/i
    ]

    for (const pattern of pricePatterns) {
      const match = text.match(pattern)
      if (match) {
        const originalPrice = match[2] || match[1]
        const currentPrice = match[1] || match[2]

        if (originalPrice && currentPrice) {
          const original = parseFloat(originalPrice.replace(',', '.'))
          const current = parseFloat(currentPrice.replace(',', '.'))

          if (current < original) {
            const discountPercentage = Math.round(((original - current) / original) * 100)
            return {
              currentPrice: current.toFixed(2),
              originalPrice: original.toFixed(2),
              discountPercentage
            }
          }
        }
      }
    }

    // 如果没有找到折扣价格，尝试提取单个价格
    const singlePriceMatch = text.match(/(\d+(?:[.,]\d+)?)\s*€/)
    if (singlePriceMatch) {
      return {
        currentPrice: parseFloat(singlePriceMatch[1].replace(',', '.')).toFixed(2)
      }
    }

    return {}
  }

  private extractImageUrl(content: string): string | null {
    // 从HTML内容中提取图片URL
    const imgMatches = [
      // img标签
      /<img[^>]+src=["']([^"']+)["'][^>]*>/i,
      // WordPress媒体格式
      /wp-content\/uploads\/[^"'\s]+\.(jpg|jpeg|png|gif|webp)/i,
      // Amazon图片
      /https:\/\/[^"'\s]*amazon[^"'\s]*\.(jpg|jpeg|png|gif|webp)/i
    ]

    for (const pattern of imgMatches) {
      const match = content.match(pattern)
      if (match) {
        return match[1] || match[0]
      }
    }

    return null
  }

  private async extractImageFromDealPage(dealUrl: string): Promise<string | null> {
    try {
      // 只抓取Sparhamster.at的内部链接，避免抓取外部商店
      if (!dealUrl.includes('sparhamster.at')) {
        return null
      }

      const response = await fetch(dealUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (!response.ok) {
        return null
      }

      const html = await response.text()

      // 寻找多种可能的图片格式
      const imagePatterns = [
        // 产品图片 - og:image
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        // Twitter图片
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        // 主要图片标签
        /<img[^>]+class=[^>]*(?:product|deal|main|featured)[^>]*src=["']([^"']+)["'][^>]*>/i,
        // 任何图片标签
        /<img[^>]+src=["']([^"']+)["'][^>]*>/i
      ]

      for (const pattern of imagePatterns) {
        const match = html.match(pattern)
        if (match && match[1]) {
          let imageUrl = match[1]

          // 确保URL是完整的
          if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl
          } else if (imageUrl.startsWith('/')) {
            imageUrl = 'https://www.sparhamster.at' + imageUrl
          }

          // 验证图片URL格式
          if (imageUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
            return imageUrl
          }
        }
      }

      return null
    } catch (error) {
      console.error('Error extracting image from deal page:', error)
      return null
    }
  }

  private getPlaceholderImage(categories?: string[]): string {
    // 使用可用的占位图服务或本地图片
    if (!categories) return 'https://picsum.photos/300/200?random=1'

    const categoryImages: Record<string, string> = {
      'elektronik': 'https://picsum.photos/300/200?random=2',
      'amazon': 'https://picsum.photos/300/200?random=3',
      'fashion': 'https://picsum.photos/300/200?random=4',
      'gaming': 'https://picsum.photos/300/200?random=5',
      'haushalt': 'https://picsum.photos/300/200?random=6',
      'beauty': 'https://picsum.photos/300/200?random=7',
      'lebensmittel': 'https://picsum.photos/300/200?random=8'
    }

    for (const category of categories) {
      const key = category.toLowerCase()
      if (categoryImages[key]) {
        return categoryImages[key]
      }
    }

    return 'https://picsum.photos/300/200?random=9'
  }

  private mapCategory(categories?: string[]): string {
    if (!categories || categories.length === 0) return 'General'

    const categoryMapping: Record<string, string> = {
      'elektronik': 'Electronics',
      'amazon': 'Electronics',
      'fashion': 'Fashion',
      'kleidung': 'Fashion',
      'gaming': 'Gaming',
      'spiele': 'Gaming',
      'haushalt': 'Home & Kitchen',
      'küche': 'Home & Kitchen',
      'beauty': 'Beauty & Health',
      'sport': 'Sports & Outdoor',
      'auto': 'Automotive',
      'bücher': 'Books',
      'musik': 'Music & Movies'
    }

    for (const category of categories) {
      const key = category.toLowerCase()
      if (categoryMapping[key]) {
        return categoryMapping[key]
      }
    }

    return categories[0] || 'General'
  }

  private cleanDescription(description: string): string {
    return description
      .replace(/<[^>]*>/g, '') // 移除HTML标签
      .replace(/&[a-zA-Z0-9#]+;/g, '') // 移除HTML实体
      .replace(/\s+/g, ' ') // 压缩空白
      .trim()
      .substring(0, 300) // 限制长度
  }

  private cleanHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // 移除脚本
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // 移除样式
      .replace(/<!--[\s\S]*?-->/g, '') // 移除注释
      .trim()
  }

  private cleanTitleFromPriceInfo(title: string): string {
    // 移除标题中的价格信息，只保留产品名称
    let cleanTitle = title

    // 移除各种价格格式
    const pricePatterns = [
      // "um 70 € statt 120 €" 格式
      /\s+um\s+\d+(?:[.,]\d+)?\s*€\s+statt\s+\d+(?:[.,]\d+)?\s*€/gi,
      // "für 70€ statt 120€" 格式
      /\s+für\s+\d+(?:[.,]\d+)?\s*€\s+statt\s+\d+(?:[.,]\d+)?\s*€/gi,
      // "70€ statt 120€" 格式
      /\s+\d+(?:[.,]\d+)?\s*€\s+statt\s+\d+(?:[.,]\d+)?\s*€/gi,
      // "– 30€ Startgutschrift" 等格式
      /\s*–\s*\d+(?:[.,]\d+)?\s*€.*$/gi,
      // ", keine Jahresgebühr" 等格式
      /\s*,\s*(keine|mit|ohne|bis zu).*$/gi,
      // 以价格开头的格式
      /^\d+(?:[.,]\d+)?\s*€.*?–\s*/gi,
      // 其他价格相关词汇
      /\s+(ab|für|um|von|bis|statt|anstatt)\s+\d+(?:[.,]\d+)?\s*€.*$/gi,
    ]

    for (const pattern of pricePatterns) {
      cleanTitle = cleanTitle.replace(pattern, '')
    }

    // 清理多余的空格和标点
    cleanTitle = cleanTitle
      .replace(/\s+/g, ' ')
      .replace(/[–-]\s*$/, '')
      .trim()

    return cleanTitle
  }

  private generateId(url: string): string {
    // 从URL生成稳定的唯一ID
    // 首先尝试从URL路径提取稳定的标识符
    const urlPath = url.split('/').pop()?.replace(/[^a-zA-Z0-9-]/g, '') || ''

    if (urlPath && urlPath.length >= 6) {
      // 如果URL路径足够长且包含有意义的内容，直接使用
      return urlPath.toLowerCase()
    }

    // 否则，使用URL的稳定哈希值生成ID
    return this.hashString(url)
  }

  private hashString(str: string): string {
    // 简单但稳定的字符串哈希函数
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }

    // 转换为正数并生成9位字符的ID
    const positive = Math.abs(hash)
    return positive.toString(36).padStart(9, '0').substr(0, 9)
  }

  private async translateText(text: string, preserveNumbers: boolean = true): Promise<string> {
    // 扩展的德语到中文翻译词典
    const translations: Record<string, string> = {
      // 基础词汇
      'und': '和',
      'oder': '或',
      'mit': '带',
      'ohne': '不带',
      'für': '用于',
      'bei': '在',
      'von': '从',
      'zu': '到',
      'um': '',  // 在价格表达中"um 70€"翻译为"70€",不需要额外的词
      'statt': '原价',
      'nur': '仅',
      'auch': '也',
      'jetzt': '现在',
      'neu': '新',
      'alt': '旧',
      'alle': '所有',
      'bis': '直到',
      'ab': '从',
      'über': '超过',
      'unter': '低于',

      // 优惠相关
      'rabatt': '折扣',
      'angebot': '优惠',
      'deal': '优惠',
      'schnäppchen': '特价',
      'aktion': '活动',
      'sale': '促销',
      'preis': '价格',
      'bestpreis': '最佳价格',
      'günstig': '便宜',
      'günstiger': '更便宜',
      'günstigste': '最便宜',
      'billig': '便宜',
      'teuer': '昂贵',
      'kostenlos': '免费',
      'gratis': '免费',
      'sparen': '节省',
      'reduziert': '降价',
      'prozent': '百分比',
      'euro': '欧元',
      'versand': '运费',
      'versandkostenfrei': '免运费',
      'lieferung': '配送',
      'sofort': '立即',
      'verfügbar': '可用',
      'lagernd': '有库存',
      'ausverkauft': '售罄',
      'begrenzt': '限量',
      'limitiert': '限制',

      // 商品类别
      'elektronik': '电子产品',
      'handy': '手机',
      'smartphone': '智能手机',
      'tablet': '平板',
      'laptop': '笔记本电脑',
      'computer': '电脑',
      'fernseher': '电视',
      'kamera': '相机',
      'kopfhörer': '耳机',
      'lautsprecher': '扬声器',
      'spielzeug': '玩具',
      'kleidung': '服装',
      'schuhe': '鞋子',
      'tasche': '包',
      'uhr': '手表',
      'schmuck': '珠宝',
      'buch': '书',
      'musik': '音乐',
      'film': '电影',
      'spiel': '游戏',
      'sport': '运动',
      'fitness': '健身',
      'gesundheit': '健康',
      'beauty': '美容',
      'haushalt': '家用',
      'küche': '厨房',
      'garten': '花园',
      'auto': '汽车',
      'werkzeug': '工具',

      // 品牌和商家
      'amazon': 'Amazon',
      'philips': '飞利浦',
      'samsung': '三星',
      'apple': '苹果',
      'sony': '索尼',
      'lg': 'LG',
      'nike': '耐克',
      'adidas': '阿迪达斯',
      'mammut': 'Mammut猛犸象',
      'gardena': 'Gardena嘉丁娜',
      'mediamarkt': 'Media Markt',
      'saturn': 'Saturn',
      'otto': 'Otto',
      'zalando': 'Zalando',
      'h&m': 'H&M',
      'zara': 'Zara',
      'ikea': 'IKEA宜家',
      'lidl': 'Lidl',
      'aldi': 'Aldi',
      'dm': 'DM',
      'rossmann': 'Rossmann',
      'tchibo': 'Tchibo',
      'conrad': 'Conrad',
      'notebooksbilliger': 'NotebooksBilliger',
      'alternate': 'Alternate',
      'cyberport': 'Cyberport',
      'booking': 'Booking.com',
      'expedia': 'Expedia',
      'hotels': 'Hotels.com',

      // 动作词汇
      'kaufen': '购买',
      'bestellen': '订购',
      'erhalten': '获得',
      'bekommen': '得到',
      'zahlen': '支付',
      'verkaufen': '销售',
      'tauschen': '交换',
      'zurück': '退回',

      // 时间相关
      'heute': '今天',
      'morgen': '明天',
      'gestern': '昨天',
      'woche': '周',
      'monat': '月',
      'jahr': '年',
      'tag': '天',
      'stunde': '小时',
      'minute': '分钟',
      'zeit': '时间',
      'schnell': '快速',
      'langsam': '慢',

      // 质量描述
      'gut': '好',
      'besser': '更好',
      'beste': '最好',
      'schlecht': '坏',
      'schlechter': '更坏',
      'modern': '现代',
      'klassisch': '经典',
      'premium': '高端',
      'standard': '标准',
      'basic': '基础',
      'professional': '专业',
      'original': '原装',
      'echt': '真正',
      'falsch': '错误',

      // 数量和大小
      'groß': '大',
      'größer': '更大',
      'größte': '最大',
      'klein': '小',
      'kleiner': '更小',
      'kleinste': '最小',
      'viel': '多',
      'mehr': '更多',
      'wenig': '少',
      'weniger': '更少',
      'nichts': '无',
      'etwas': '一些',
      'alles': '一切',

      // 服装类
      'jacke': '夹克',
      'jacket': '夹克',
      'hose': '裤子',
      'jeans': '牛仔裤',
      'shirt': '衬衫',
      't-shirt': 'T恤',
      'pullover': '毛衣',
      'kleid': '连衣裙',
      'rock': '裙子',
      'mantel': '外套',
      'schal': '围巾',
      'mütze': '帽子',
      'handschuhe': '手套',
      'socken': '袜子',
      'unterwäsche': '内衣',

      // 技术相关
      'objektiv': '镜头',
      'speicher': '存储',
      'festplatte': '硬盘',
      'ssd': 'SSD',
      'ram': '内存',
      'prozessor': '处理器',
      'grafikkarte': '显卡',
      'monitor': '显示器',
      'tastatur': '键盘',
      'maus': '鼠标',
      'drucker': '打印机',
      'scanner': '扫描仪',
      'router': '路由器',
      'wlan': 'WiFi',
      'bluetooth': '蓝牙',
      'usb': 'USB',
      'hdmi': 'HDMI',
      'akku': '电池',
      'ladegerät': '充电器',
      'kabel': '线缆',

      // 户外运动
      'wandern': '徒步',
      'klettern': '攀登',
      'camping': '露营',
      'rucksack': '背包',
      'zelt': '帐篷',
      'schlafsack': '睡袋',
      'outdoor': '户外',
      'wasserdicht': '防水',
      'atmungsaktiv': '透气',
      'leicht': '轻便',
      'warm': '保暖',
      'isoliert': '隔离',

      // 家居用品
      'möbel': '家具',
      'stuhl': '椅子',
      'tisch': '桌子',
      'bett': '床',
      'schrank': '衣柜',
      'regal': '书架',
      'lampe': '灯',
      'vorhang': '窗帘',
      'teppich': '地毯',
      'kissen': '枕头',
      'decke': '毯子',

      // 德语特殊表达
      'unkrautstecher': '除草器',
      'wanderjacke': '登山夹克',
      'damen': '女士',
      'herren': '男士',
      'kinder': '儿童',
      'unisex': '中性',
      'größe': '尺寸',
      'farbe': '颜色',
      'schwarz': '黑色',
      'weiß': '白色',
      'rot': '红色',
      'blau': '蓝色',
      'grün': '绿色',
      'gelb': '黄色',
      'grau': '灰色',
      'braun': '棕色',
      'rosa': '粉色',
      'lila': '紫色',

      // 奥地利特有词汇
      'österreich': '奥地利',
      'vienna': '维也纳',
      'salzburg': '萨尔茨堡',
      'innsbruck': '因斯布鲁克',
      'graz': '格拉茨',
      'linz': '林茨',
      'deutschland': '德国',
      'germany': '德国',
      'schweiz': '瑞士',
      'switzerland': '瑞士',

      // 购物相关短语
      'startgutschrift': '开户奖励',
      'neukunden': '新客户',
      'keine jahresgebühr': '无年费',
      'cashback': '返现',
      'kreditkarte': '信用卡',
      'visa': 'Visa卡',
      'mastercard': '万事达卡',
      'prime': 'Prime会员',
      'jahresgebühr': '年费',
      'gutschrift': '返现金',

      // 电器和技术产品
      'rasierer': '剃须刀',
      'elektrisch': '电动',
      'elektrischer': '电动',
      'nass': '湿',
      'trocken': '干',
      'trockenrasierer': '干式剃须刀',
      'hooded': '连帽',
      'ecoline': 'Eco系列',
      'se': '特别版',
      'edition': '版本',
      'modell': '型号',
      'serie': '系列',
      'generation': '代',
      'version': '版本',
      'typ': '类型',
      'art': '种类',
      'stil': '风格',
      'design': '设计',
      'form': '形式',
      'gewicht': '重量',
      'material': '材质',
      'qualität': '质量',
      'garantie': '保修',
      'service': '服务',
      'support': '支持',
      'hilfe': '帮助',
      'information': '信息',
      'details': '详情',
      'beschreibung': '描述',
      'eigenschaften': '特性',
      'funktion': '功能',
      'leistung': '性能',
      'effizienz': '效率',
      'sicherheit': '安全',
      'komfort': '舒适',
      'bequem': '舒适',
      'einfach': '简单',
      'praktisch': '实用',
      'nützlich': '有用',
      'perfekt': '完美',
      'ideal': '理想',
      'optimal': '最佳',
      'empfohlen': '推荐',
      'beliebt': '热门',
      'bekannt': '知名',
      'berühmt': '著名',
      'exklusiv': '独家',
      'sonderangebot': '特别优惠',
      'top': '顶级',
      'bestseller': '畅销',
      'testsieger': '测试冠军',
      'award': '获奖',
      'prämiert': '获奖',
      'zertifiziert': '认证',
      'geprüft': '检验',
      'getestet': '测试'
    }

    let translated = text.toLowerCase()

    // 保护数字格式，临时替换
    const numberPlaceholders: Array<{placeholder: string, original: string}> = []
    let placeholderIndex = 0

    // 保护价格格式（如 65,53 €, 83,10 € 等）
    translated = translated.replace(/(\d+(?:[.,]\d+)?)\s*€/g, (match, number) => {
      const placeholder = `__NUMBER_${placeholderIndex}__`
      numberPlaceholders.push({placeholder, original: match})
      placeholderIndex++
      return placeholder
    })

    // 先处理特殊短语和复合词
    const specialPhrases: Record<string, string> = {
      // 价格表达式 - 最优先处理
      'um\\s+(\\d+(?:[.,]\\d+)?)\\s*€\\s+statt\\s+(\\d+(?:[.,]\\d+)?)\\s*€': '$1€，原价 $2€',
      'für\\s+(\\d+(?:[.,]\\d+)?)\\s*€\\s+statt\\s+(\\d+(?:[.,]\\d+)?)\\s*€': '$1€，原价 $2€',
      '(\\d+(?:[.,]\\d+)?)\\s*€\\s+statt\\s+(\\d+(?:[.,]\\d+)?)\\s*€': '$1€，原价 $2€',
      'statt': '原价',
      'keine jahresgebühr': '无年费',
      'kostenloser versand': '免费配送',
      'schnelle lieferung': '快速配送',
      'sofortiger versand': '立即发货',
      'begrenzte zeit': '限时',
      'nur heute': '仅今日',
      'nur noch': '仅剩',
      'ab sofort': '即日起',
      'bis zu': '高达',
      'mehr als': '超过',
      'weniger als': '不到',
      'inklusive versand': '包邮',
      'exklusive versand': '不含运费',
      'zur verfügung': '可用',
      'nicht verfügbar': '不可用',
      'auf lager': '有库存',
      'nicht auf lager': '缺货',
      'sofort lieferbar': '现货',
      'voraussichtlich lieferbar': '预计供货',
      'amazon visa kreditkarte für österreich': 'Amazon Visa信用卡用于奥地利',
      'für österreich': '用于奥地利',
      'österreich': '奥地利',
      'in österreich': '在奥地利',
      'aus österreich': '来自奥地利',
      'nach österreich': '到奥地利',
      'damen-wanderjacke': '女士登山夹克',
      'herren-wanderjacke': '男士登山夹克',
      'kinder-wanderjacke': '儿童登山夹克',
      'nass- und trockenrasierer': '干湿两用剃须刀',
      'elektrischer nass- und trockenrasierer': '电动干湿两用剃须刀',
      'mammut shuksan': 'Mammut猛犸象 Shuksan',
      'amazon visa kreditkarte': 'Amazon Visa信用卡',
      'philips s5466/18': '飞利浦 S5466/18',
      'gardena ecoline': 'Gardena嘉丁娜 EcoLine',
      'shuksan in hooded jacket': 'Shuksan IN连帽夹克',
      'hooded jacket se': '连帽夹克特别版',
      'mammut shuksan in hooded jacket se': 'Mammut猛犸象 Shuksan IN连帽夹克特别版',
      'philips s5466/18 elektrischer nass- und trockenrasierer': '飞利浦 S5466/18 电动干湿两用剃须刀',
    }

    // 先处理特殊短语
    for (const [phrase, translation] of Object.entries(specialPhrases)) {
      translated = translated.replace(new RegExp(phrase, 'gi'), translation)
    }

    // 执行单词翻译替换（按长度排序，避免短词汇覆盖长词汇）
    const sortedKeys = Object.keys(translations).sort((a, b) => b.length - a.length)

    for (const german of sortedKeys) {
      const chinese = translations[german]
      // 使用词边界匹配，避免部分词汇替换
      translated = translated.replace(new RegExp(`\\b${german}\\b`, 'gi'), chinese)
    }

    // 恢复受保护的数字格式
    for (const {placeholder, original} of numberPlaceholders) {
      translated = translated.replace(placeholder, original)
    }

    // 清理和格式化
    translated = translated
      .replace(/\s+/g, ' ') // 合并多余空格
      .replace(/\s*([.;!?])\s*/g, '$1 ') // 标点符号格式化
      .replace(/([猛犸象猛犸象|飞利浦飞利浦])/g, (match) => match.slice(0, match.length/2)) // 修复重复的品牌翻译
      .trim()

    // 首字母大写
    if (translated.length > 0) {
      translated = translated.charAt(0).toUpperCase() + translated.slice(1)
    }

    return translated
  }
}

// 导出单例实例
export const sparhamsterFetcher = new SparhamsterFetcher()