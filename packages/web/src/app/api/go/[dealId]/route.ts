import { NextRequest, NextResponse } from 'next/server'
import { clickTracker } from '@/lib/tracking/click-tracker'
import { createModuleLogger } from '@/lib/logger'
import { dealsService } from '@/lib/services/deals-service'

const logger = createModuleLogger('api:go')

/**
 * 转跳追踪 API
 *
 * 用途：
 * 1. 追踪用户点击行为
 * 2. 灵活切换链接（自己的联盟链接 > sparhamster链接 > 商家主页）
 * 3. 为未来的联盟计划做准备
 *
 * 路由: GET /api/go/:dealId
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const dealId = params.dealId

    // 获取deal信息（从缓存或API）
    const deal = await getDealById(dealId)

    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      )
    }

    // 确定最终跳转URL（优先级顺序）
    const targetUrl =
      deal.affiliateUrl ||      // 1. 你自己的联盟链接（优先）
      deal.dealUrl ||            // 2. sparhamster的forward链接
      deal.merchantHomepage ||   // 3. 商家主页
      '#'                        // 4. fallback

    // 记录点击事件
    await trackClickEvent(request, deal, targetUrl)

    // 重定向到目标URL
    return NextResponse.redirect(targetUrl)

  } catch (error) {
    logger.error('Error in /api/go/:dealId', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 根据ID获取deal信息
 *
 * 当前实现：从数据库获取
 * 使用dealsService（已包含缓存层）
 */
async function getDealById(dealId: string) {
  try {
    // 从数据库获取deal（包含缓存）
    return await dealsService.getDealById(dealId)
  } catch (error) {
    logger.error('Error fetching deal', error as Error, { dealId })
    return null
  }
}

/**
 * 记录点击事件
 */
async function trackClickEvent(
  request: NextRequest,
  deal: any,
  targetUrl: string
) {
  try {
    // 提取用户信息
    const userAgent = request.headers.get('user-agent') || undefined
    const referer = request.headers.get('referer') || undefined

    // 获取客户端IP（考虑代理）
    const forwarded = request.headers.get('x-forwarded-for')
    const userIp = forwarded ? forwarded.split(',')[0] :
                   request.headers.get('x-real-ip') ||
                   undefined

    // 简单的设备类型检测
    const deviceType = detectDeviceType(userAgent)

    // 记录点击
    await clickTracker.trackClick({
      dealId: deal.id,
      targetUrl,
      merchantName: deal.merchantName,
      userIp,
      userAgent,
      referer,
      deviceType,
    })
  } catch (error) {
    // 追踪失败不应该影响跳转
    logger.error('Error tracking click', error as Error, { dealId: deal.id })
  }
}

/**
 * 简单的设备类型检测
 */
function detectDeviceType(userAgent?: string): 'mobile' | 'tablet' | 'desktop' {
  if (!userAgent) return 'desktop'

  const ua = userAgent.toLowerCase()

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet'
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
    return 'mobile'
  }
  return 'desktop'
}
