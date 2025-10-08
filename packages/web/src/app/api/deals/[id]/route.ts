import { NextRequest, NextResponse } from 'next/server'
import { createModuleLogger } from '@/lib/logger'
import { dealsService } from '@/lib/services/deals-service'

const logger = createModuleLogger('api:deals:id')

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
    const deal = await dealsService.getDealById(id)

    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      )
    }

    // 检查是否过期
    const now = new Date()
    const isExpired = new Date(deal.expiresAt) < now
    const daysRemaining = Math.max(
      Math.ceil((new Date(deal.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      0
    )

    // 添加额外信息
    const enrichedDeal = {
      ...deal,
      isExpired,
      daysRemaining,
      viewedAt: new Date().toISOString(),
    }

    return NextResponse.json(enrichedDeal)

  } catch (error) {
    logger.error('Error fetching deal', error as Error)
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
      message: 'Deal update endpoint is not yet connected to the database',
      dealId: id,
      updates: body,
      updatedAt: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Error updating deal', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
