import { NextRequest, NextResponse } from 'next/server'
import { clickTracker } from '@/lib/tracking/click-tracker'
import { createModuleLogger } from '@/lib/logger'

const logger = createModuleLogger('api:tracking:stats')

/**
 * 点击统计 API
 *
 * 用途：查看点击追踪数据（仅开发/管理员使用）
 *
 * GET /api/tracking/stats
 * GET /api/tracking/stats?dealId=xxx
 * GET /api/tracking/stats?limit=10&orderBy=totalClicks
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dealId = searchParams.get('dealId')
    const limit = searchParams.get('limit')
    const orderBy = searchParams.get('orderBy') as 'totalClicks' | 'uniqueClicks' | undefined

    if (dealId) {
      // 获取特定deal的详细统计
      const detailedStats = await clickTracker.getDetailedStats(dealId)

      if (!detailedStats) {
        return NextResponse.json({
          dealId,
          totalClicks: 0,
          uniqueIps: 0,
          message: 'No clicks found for this deal'
        })
      }

      return NextResponse.json({
        dealId,
        totalClicks: detailedStats.totalClicks,
        uniqueClicks: detailedStats.uniqueClicks,
        lastClickedAt: detailedStats.lastClickedAt,
        clicksByDay: detailedStats.clicksByDay,
        clicksByMerchant: detailedStats.clicksByMerchant
      })
    }

    // 获取所有统计
    const allStats = await clickTracker.getAllStats({
      limit: limit ? parseInt(limit) : undefined,
      orderBy: orderBy || 'totalClicks'
    })

    // 获取最近的点击记录
    const recentClicks = await clickTracker.getAllClicks({
      limit: 10,
      orderBy: 'clickedAt',
      order: 'desc'
    })

    // 计算总点击数
    const totalClicks = allStats.reduce((sum, stat) => sum + stat.totalClicks, 0)

    // 统计设备类型分布
    const deviceStats = { mobile: 0, tablet: 0, desktop: 0 }
    recentClicks.forEach(click => {
      if (click.deviceType) {
        deviceStats[click.deviceType]++
      }
    })

    return NextResponse.json({
      totalClicks,
      totalDeals: allStats.length,
      stats: allStats.map(stat => ({
        dealId: stat.dealId,
        totalClicks: stat.totalClicks,
        uniqueClicks: stat.uniqueClicks,
        lastClickedAt: stat.lastClickedAt,
        clicksByDay: stat.clicksByDay,
        topMerchants: Object.entries(stat.clicksByMerchant || {})
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([name, count]) => ({ name, count }))
      })),
      recentClicks: recentClicks.map(click => ({
        id: click.id,
        dealId: click.dealId,
        clickedAt: click.clickedAt,
        merchantName: click.merchantName,
        deviceType: click.deviceType,
        userAgent: click.userAgent?.substring(0, 50)
      })),
      deviceStats
    })

  } catch (error) {
    logger.error('Error getting tracking stats', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
