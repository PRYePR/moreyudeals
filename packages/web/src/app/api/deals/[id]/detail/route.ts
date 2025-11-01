import { NextRequest, NextResponse } from 'next/server'
import { detailPageFetcher } from '@/lib/detail-page-fetcher'
import { Deal } from '@/lib/fetchers/types'
import { createModuleLogger } from '@/lib/logger'

const logger = createModuleLogger('api:deals:detail')

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const dealId = resolvedParams.id

    // 从请求体获取完整的 deal 对象
    const deal: Deal = await request.json()

    if (!deal || !deal.id) {
      return NextResponse.json(
        { error: 'Valid deal object is required' },
        { status: 400 }
      )
    }

    logger.info('Generating detail content for deal', {
      dealId,
      title: deal.translatedTitle || deal.title
    })

    // 从 deal 对象生成详细内容
    const detailContent = await detailPageFetcher.fetchDetailContent(deal)

    return NextResponse.json({
      success: true,
      dealId,
      content: detailContent,
      fetchedAt: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Error generating deal details', error as Error)

    return NextResponse.json(
      {
        error: 'Failed to generate deal details',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}