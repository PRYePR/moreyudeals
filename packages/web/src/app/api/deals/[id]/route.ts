import { NextRequest, NextResponse } from 'next/server'

// 模拟数据（稍后将从实际数据库获取）
const mockDeals = [
  {
    id: '1',
    title: 'Samsung Galaxy S24 Ultra - Exklusiver Rabatt',
    originalTitle: 'Samsung Galaxy S24 Ultra - Exklusiver Rabatt',
    translatedTitle: 'Samsung Galaxy S24 Ultra - 独家折扣',
    description: 'Sparen Sie 200€ beim Kauf des neuen Samsung Galaxy S24 Ultra. Limitiertes Angebot nur für kurze Zeit verfügbar. Das Smartphone bietet eine 200MP Kamera, S Pen Integration und bis zu 1TB Speicherplatz.',
    originalDescription: 'Sparen Sie 200€ beim Kauf des neuen Samsung Galaxy S24 Ultra. Limitiertes Angebot nur für kurze Zeit verfügbar. Das Smartphone bietet eine 200MP Kamera, S Pen Integration und bis zu 1TB Speicherplatz.',
    translatedDescription: '购买新款Samsung Galaxy S24 Ultra可节省200欧元。限时优惠，数量有限。该智能手机配备200万像素摄像头、S Pen集成和高达1TB存储空间。',
    price: '899.99',
    originalPrice: '1099.99',
    currency: 'EUR',
    discountPercentage: 18,
    imageUrl: 'https://images.samsung.com/is/image/samsung/assets/de/smartphones/galaxy-s24/images/galaxy-s24-ultra_highlights_design.jpg',
    dealUrl: 'https://example-german-store.de/samsung-galaxy-s24-ultra',
    category: 'Electronics',
    source: 'DealNews DE',
    publishedAt: '2024-01-15T10:00:00Z',
    expiresAt: '2024-02-15T23:59:59Z',
    language: 'de',
    translationProvider: 'deepl',
    isTranslated: true,
    rssSource: 'https://example-dealsite.de/rss',
    tags: ['Smartphone', 'Samsung', 'Android', '5G', 'Photography'],
    specifications: {
      brand: 'Samsung',
      model: 'Galaxy S24 Ultra',
      color: 'Titan Black, Titan Gray, Titan Violet, Titan Yellow',
      storage: '256GB / 512GB / 1TB',
      camera: '200MP Main + 50MP Telephoto + 12MP Ultra Wide + 10MP Telephoto',
      display: '6.8" Dynamic AMOLED 2X, 120Hz',
      processor: 'Snapdragon 8 Gen 3',
      battery: '5000mAh'
    },
    dealDetails: {
      priceHistory: [
        { date: '2024-01-01', price: '1199.99' },
        { date: '2024-01-10', price: '1099.99' },
        { date: '2024-01-15', price: '899.99' }
      ],
      stockStatus: 'In Stock',
      shippingInfo: 'Kostenloser Versand innerhalb Deutschlands',
      returnPolicy: '14 Tage Rückgaberecht',
      warranty: '2 Jahre Herstellergarantie'
    }
  }
]

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const id = resolvedParams.id

    if (!id) {
      return NextResponse.json(
        { error: 'Deal ID is required' },
        { status: 400 }
      )
    }

    // 查找特定优惠信息
    const deal = mockDeals.find(deal => deal.id === id)

    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      )
    }

    // 检查是否过期
    const now = new Date()
    const isExpired = new Date(deal.expiresAt) < now
    const daysRemaining = Math.ceil((new Date(deal.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // 添加额外信息
    const enrichedDeal = {
      ...deal,
      isExpired,
      daysRemaining,
      viewedAt: new Date().toISOString(),
    }

    return NextResponse.json(enrichedDeal)

  } catch (error) {
    console.error('Error fetching deal:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 更新优惠信息（如点击次数、浏览次数等）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const id = resolvedParams.id
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Deal ID is required' },
        { status: 400 }
      )
    }

    // 验证请求体
    const allowedUpdates = ['views', 'clicks', 'likes']
    const updates = Object.keys(body)
    const isValidOperation = updates.every(update => allowedUpdates.includes(update))

    if (!isValidOperation) {
      return NextResponse.json(
        { error: 'Invalid updates!' },
        { status: 400 }
      )
    }

    // 这里应该更新数据库中的信息
    // 目前返回模拟响应
    return NextResponse.json({
      message: 'Deal updated successfully',
      dealId: id,
      updates: body,
      updatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error updating deal:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}