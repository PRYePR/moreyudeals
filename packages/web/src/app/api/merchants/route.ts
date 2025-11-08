import { NextResponse } from 'next/server'
import { apiClient } from '@/lib/api-client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const response = await apiClient.getMerchants()
    // 后端返回 { data: [...] }，转换为 { merchants: [...] }
    return NextResponse.json({
      merchants: response.data || []
    })
  } catch (error) {
    console.error('Error fetching merchants:', error)
    return NextResponse.json(
      { merchants: [] },
      { status: 200 } // 返回空数组而不是500错误
    )
  }
}
