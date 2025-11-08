import { NextResponse } from 'next/server'
import { apiClient } from '@/lib/api-client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const response = await apiClient.getCrossFilter()
    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Error fetching cross-filter data:', error)
    return NextResponse.json(
      {
        categoryByMerchant: {},
        merchantByCategory: {}
      },
      { status: 200 } // 返回空对象而不是500错误
    )
  }
}
