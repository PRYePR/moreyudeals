import { NextRequest, NextResponse } from 'next/server'
import { createModuleLogger } from '@/lib/logger'
import { dealsService } from '@/lib/services/deals-service'

const logger = createModuleLogger('api:deals:id')

/**
 * 构建时间状态信息（服务端一次性计算，避免 hydration mismatch）
 */
function buildTimeStatus(deal: any) {
  const now = new Date()
  const publishedAt = new Date(deal.publishedAt)
  const expiresAt = deal.expiresAt ? new Date(deal.expiresAt) : null

  // 格式化绝对时间（使用欧洲柏林时区）
  const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin'
  })

  const publishedAbsolute = dateFormatter.format(publishedAt)
  const expiresAbsolute = expiresAt ? dateFormatter.format(expiresAt) : null

  // 计算相对时间
  let publishedRelative: string | null = null
  const msPassed = now.getTime() - publishedAt.getTime()
  const daysPassed = Math.floor(msPassed / (1000 * 60 * 60 * 24))

  if (daysPassed < 1) {
    const hoursPassed = Math.floor(msPassed / (1000 * 60 * 60))
    if (hoursPassed < 1) {
      publishedRelative = '刚刚发布'
    } else {
      publishedRelative = `${hoursPassed} 小时前`
    }
  } else if (daysPassed === 1) {
    publishedRelative = '1 天前'
  } else {
    publishedRelative = `${daysPassed} 天前`
  }

  // 计算过期状态
  let isExpired = false
  let daysRemaining: number | null = null
  let badgeLabel = ''
  let badgeTone: 'expired' | 'active' | 'published' = 'published'

  if (expiresAt) {
    const msUntilExpire = expiresAt.getTime() - now.getTime()
    isExpired = msUntilExpire < 0

    if (isExpired) {
      // 已过期
      const msExpired = Math.abs(msUntilExpire)
      const daysExpired = Math.floor(msExpired / (1000 * 60 * 60 * 24))
      if (daysExpired < 1) {
        const hoursExpired = Math.floor(msExpired / (1000 * 60 * 60))
        badgeLabel = `已过期 ${hoursExpired} 小时`
      } else if (daysExpired === 1) {
        badgeLabel = '已过期 1 天'
      } else {
        badgeLabel = `已过期 ${daysExpired} 天`
      }
      badgeTone = 'expired'
      daysRemaining = 0
    } else {
      // 未过期
      const daysLeft = Math.ceil(msUntilExpire / (1000 * 60 * 60 * 24))
      if (daysLeft < 1) {
        const hoursLeft = Math.ceil(msUntilExpire / (1000 * 60 * 60))
        badgeLabel = `还剩 ${hoursLeft} 小时`
      } else {
        badgeLabel = `还剩 ${daysLeft} 天`
      }
      badgeTone = 'active'
      daysRemaining = daysLeft
    }
  } else {
    // 没有过期时间，显示发布时间
    badgeLabel = publishedRelative || publishedAbsolute
    badgeTone = 'published'
    daysRemaining = null
  }

  return {
    publishedAbsolute,
    publishedRelative,
    expiresAbsolute,
    badgeLabel,
    badgeTone,
    daysRemaining,
    isExpired
  }
}

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

    // 查找特定优惠信息（从数据库读取，包含完整字段如 contentHtml）
    const deal = await dealsService.getDealById(id, { fromDatabase: true })

    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      )
    }

    // 构建时间状态信息（服务端一次性计算，避免客户端 hydration mismatch）
    const timeStatus = buildTimeStatus(deal)

    // 添加额外信息
    const enrichedDeal = {
      ...deal,
      timeStatus,
      // 保留这些字段以保持向后兼容
      isExpired: timeStatus.isExpired,
      daysRemaining: timeStatus.daysRemaining ?? 0,
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
