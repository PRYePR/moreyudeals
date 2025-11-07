import { NextResponse } from 'next/server'
import { apiClient } from '@/lib/api-client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const stats = await apiClient.getStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
