import { NextRequest, NextResponse } from 'next/server'

// 分类配置数据
const categories = [
  {
    id: 'electronics',
    name: 'Electronics',
    translatedName: '电子产品',
    icon: '📱',
    description: 'Smartphones, Laptops, Tablets und mehr',
    translatedDescription: '智能手机、笔记本电脑、平板电脑等',
    count: 234,
    subcategories: [
      { id: 'smartphones', name: 'Smartphones', translatedName: '智能手机', count: 89 },
      { id: 'laptops', name: 'Laptops', translatedName: '笔记本电脑', count: 45 },
      { id: 'tablets', name: 'Tablets', translatedName: '平板电脑', count: 32 },
      { id: 'headphones', name: 'Kopfhörer', translatedName: '耳机', count: 68 },
    ]
  },
  {
    id: 'fashion',
    name: 'Fashion',
    translatedName: '时尚服饰',
    icon: '👕',
    description: 'Kleidung, Schuhe und Accessoires',
    translatedDescription: '服装、鞋子和配饰',
    count: 189,
    subcategories: [
      { id: 'clothing', name: 'Kleidung', translatedName: '服装', count: 95 },
      { id: 'shoes', name: 'Schuhe', translatedName: '鞋子', count: 67 },
      { id: 'accessories', name: 'Accessoires', translatedName: '配饰', count: 27 },
    ]
  },
  {
    id: 'home-kitchen',
    name: 'Home & Kitchen',
    translatedName: '家居用品',
    icon: '🏠',
    description: 'Haushaltsgeräte und Küchenzubehör',
    translatedDescription: '家用电器和厨房用具',
    count: 156,
    subcategories: [
      { id: 'appliances', name: 'Haushaltsgeräte', translatedName: '家用电器', count: 78 },
      { id: 'furniture', name: 'Möbel', translatedName: '家具', count: 45 },
      { id: 'kitchenware', name: 'Küchenzubehör', translatedName: '厨房用具', count: 33 },
    ]
  },
  {
    id: 'sports',
    name: 'Sports & Outdoor',
    translatedName: '运动户外',
    icon: '⚽',
    description: 'Sportartikel und Outdoor-Ausrüstung',
    translatedDescription: '体育用品和户外装备',
    count: 145,
    subcategories: [
      { id: 'fitness', name: 'Fitness', translatedName: '健身', count: 56 },
      { id: 'outdoor', name: 'Outdoor', translatedName: '户外', count: 49 },
      { id: 'team-sports', name: 'Mannschaftssport', translatedName: '团队运动', count: 40 },
    ]
  },
  {
    id: 'beauty',
    name: 'Beauty & Health',
    translatedName: '美妆护肤',
    icon: '💄',
    description: 'Kosmetik und Gesundheitsprodukte',
    translatedDescription: '化妆品和健康产品',
    count: 98,
    subcategories: [
      { id: 'skincare', name: 'Hautpflege', translatedName: '护肤', count: 45 },
      { id: 'makeup', name: 'Make-up', translatedName: '化妆', count: 32 },
      { id: 'health', name: 'Gesundheit', translatedName: '健康', count: 21 },
    ]
  },
  {
    id: 'food',
    name: 'Food & Drinks',
    translatedName: '食品饮料',
    icon: '🍕',
    description: 'Lebensmittel und Getränke',
    translatedDescription: '食品和饮料',
    count: 87,
    subcategories: [
      { id: 'snacks', name: 'Snacks', translatedName: '零食', count: 34 },
      { id: 'beverages', name: 'Getränke', translatedName: '饮料', count: 28 },
      { id: 'organic', name: 'Bio-Produkte', translatedName: '有机产品', count: 25 },
    ]
  },
  {
    id: 'gaming',
    name: 'Gaming',
    translatedName: '游戏娱乐',
    icon: '🎮',
    description: 'Konsolen, Spiele und Gaming-Zubehör',
    translatedDescription: '游戏机、游戏和游戏配件',
    count: 112,
    subcategories: [
      { id: 'consoles', name: 'Konsolen', translatedName: '游戏机', count: 23 },
      { id: 'games', name: 'Spiele', translatedName: '游戏', count: 67 },
      { id: 'accessories', name: 'Gaming-Zubehör', translatedName: '游戏配件', count: 22 },
    ]
  },
  {
    id: 'automotive',
    name: 'Automotive',
    translatedName: '汽车用品',
    icon: '🚗',
    description: 'Auto-Zubehör und Ersatzteile',
    translatedDescription: '汽车配件和备件',
    count: 76,
    subcategories: [
      { id: 'accessories', name: 'Zubehör', translatedName: '配件', count: 45 },
      { id: 'parts', name: 'Ersatzteile', translatedName: '备件', count: 31 },
    ]
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const includeSubcategories = searchParams.get('subcategories') === 'true'
    const sortBy = searchParams.get('sortBy') || 'count'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // 复制数据以避免修改原始数据
    let processedCategories = [...categories]

    // 排序
    processedCategories.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'name':
          aValue = a.translatedName.toLowerCase()
          bValue = b.translatedName.toLowerCase()
          break
        case 'count':
          aValue = a.count
          bValue = b.count
          break
        case 'id':
          aValue = a.id
          bValue = b.id
          break
        default:
          aValue = a.count
          bValue = b.count
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      } else {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
      }
    })

    // 如果不需要子分类，移除它们
    let finalCategories: typeof processedCategories = processedCategories
    if (!includeSubcategories) {
      finalCategories = processedCategories.map(({ subcategories, ...category }) => ({
        ...category,
        subcategories: []
      }))
    }

    // 计算总统计
    const totalDeals = categories.reduce((sum, category) => sum + category.count, 0)
    const totalCategories = categories.length
    const totalSubcategories = categories.reduce((sum, category) => sum + category.subcategories.length, 0)

    const response = {
      categories: finalCategories,
      stats: {
        totalDeals,
        totalCategories,
        totalSubcategories,
      },
      filters: {
        includeSubcategories,
        sortBy,
        sortOrder,
      },
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 获取单个分类的详细信息
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { categoryId } = body

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    const category = categories.find(cat => cat.id === categoryId)

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // 添加额外的分类详细信息
    const detailedCategory = {
      ...category,
      popularity: Math.floor(Math.random() * 100) + 1, // 模拟受欢迎程度
      averageDiscount: Math.floor(Math.random() * 50) + 10, // 模拟平均折扣
      lastUpdated: new Date().toISOString(),
      trendingDeals: 3, // 模拟热门优惠数量
    }

    return NextResponse.json(detailedCategory)

  } catch (error) {
    console.error('Error fetching category details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}