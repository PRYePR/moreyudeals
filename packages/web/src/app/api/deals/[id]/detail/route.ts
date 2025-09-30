import { NextRequest, NextResponse } from 'next/server'
import { detailPageFetcher } from '@/lib/detail-page-fetcher'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const dealId = resolvedParams.id

    // 从查询参数获取原始URL
    const { searchParams } = new URL(request.url)
    const dealUrl = searchParams.get('url')

    if (!dealUrl) {
      return NextResponse.json(
        { error: 'Deal URL is required' },
        { status: 400 }
      )
    }

    // 验证URL格式
    try {
      new URL(dealUrl)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    console.log(`🔍 Fetching detail content for deal ${dealId} from ${dealUrl}`)

    // 抓取详细页内容
    const detailContent = await detailPageFetcher.fetchDetailContent(dealUrl)

    return NextResponse.json({
      success: true,
      dealId,
      url: dealUrl,
      content: detailContent,
      fetchedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching deal details:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch deal details',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// 支持OPTIONS请求（CORS预检）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}