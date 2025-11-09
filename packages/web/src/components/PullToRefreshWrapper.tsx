'use client'

import { useRouter } from 'next/navigation'
import PullToRefresh from './PullToRefresh'

export default function PullToRefreshWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const handleRefresh = async () => {
    // 刷新页面数据
    router.refresh()
    // 等待一小段时间让用户看到刷新动画
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      {children}
    </PullToRefresh>
  )
}
