/**
 * 点击追踪数据结构
 * 用于记录用户点击优惠链接的行为
 */
export interface ClickEvent {
  id: string
  dealId: string
  clickedAt: Date
  userIp?: string
  userAgent?: string
  referer?: string
  targetUrl: string
  merchantName?: string

  // 用户地理位置信息（可选）
  country?: string
  city?: string

  // 设备信息
  deviceType?: 'mobile' | 'tablet' | 'desktop'
  os?: string
  browser?: string
}

/**
 * 点击统计数据
 */
export interface ClickStats {
  dealId: string
  totalClicks: number
  uniqueClicks: number
  lastClickedAt?: Date
  clicksByDay: Record<string, number>
  clicksByMerchant: Record<string, number>
}
