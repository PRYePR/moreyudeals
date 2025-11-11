/**
 * 格式化相对时间
 * 逻辑：
 * 1. 如果有过期时间且未过期：显示"还剩 X 天"
 * 2. 如果有过期时间但已过期：显示"已过期 X 天"
 * 3. 如果没有过期时间：显示"X 天前发布"
 */
export function formatRelativeTime(publishAt: string | Date, expireAt?: string | Date | null): string {
  const now = new Date()
  const pubDate = typeof publishAt === 'string' ? new Date(publishAt) : publishAt

  // 检查是否有有效的过期时间
  if (expireAt) {
    const expDate = typeof expireAt === 'string' ? new Date(expireAt) : expireAt
    const msUntilExpire = expDate.getTime() - now.getTime()

    if (expDate > now) {
      // 未过期：显示剩余时间
      const hoursRemaining = Math.floor(msUntilExpire / (1000 * 60 * 60))

      // 小于1小时
      if (hoursRemaining < 1) {
        return '小于1小时'
      }

      // 小于24小时：显示小时
      if (hoursRemaining < 24) {
        return `还剩 ${hoursRemaining} 小时`
      }

      // 24小时以上：显示天数
      const daysRemaining = Math.floor(msUntilExpire / (1000 * 60 * 60 * 24))
      return `还剩 ${daysRemaining} 天`
    } else {
      // 已过期：显示过期时长
      const msExpired = Math.abs(msUntilExpire)
      const daysExpired = Math.floor(msExpired / (1000 * 60 * 60 * 24))

      if (daysExpired < 1) {
        const hoursExpired = Math.floor(msExpired / (1000 * 60 * 60))
        return `已过期 ${hoursExpired} 小时`
      }

      if (daysExpired === 1) {
        return '已过期 1 天'
      }

      return `已过期 ${daysExpired} 天`
    }
  }

  // 没有过期时间：显示发布时间
  const msPassed = now.getTime() - pubDate.getTime()
  const daysPassed = Math.floor(msPassed / (1000 * 60 * 60 * 24))

  if (daysPassed < 1) {
    const hoursPassed = Math.floor(msPassed / (1000 * 60 * 60))
    if (hoursPassed < 1) {
      return '刚刚发布'
    }
    return `${hoursPassed} 小时前`
  }

  if (daysPassed === 1) {
    return '1 天前'
  }

  return `${daysPassed} 天前`
}

/**
 * 格式化货币
 */
export function formatCurrency(price: number | string, currency: string = 'EUR'): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price

  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numPrice)
  } catch (error) {
    // Fallback
    return `${numPrice.toFixed(2)} ${currency}`
  }
}

/**
 * 计算折扣百分比
 */
export function calculateDiscount(currentPrice: number | string, originalPrice: number | string): number {
  const current = typeof currentPrice === 'string' ? parseFloat(currentPrice) : currentPrice
  const original = typeof originalPrice === 'string' ? parseFloat(originalPrice) : originalPrice

  if (!original || original <= current) {
    return 0
  }

  return Math.round((1 - current / original) * 100)
}
