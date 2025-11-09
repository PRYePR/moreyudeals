import { NextRequest, NextResponse } from 'next/server'
import { apiClient } from '@/lib/api-client'

export const dynamic = 'force-dynamic'

// 映射前端标准分类ID到后端德语分类名（一对多关系）
function mapCategoryToBackend(category?: string): string[] | undefined {
  if (!category) return undefined

  const categoryMapping: Record<string, string[]> = {
    'electronics': ['Elektronik', 'Computer'],
    'gaming': ['Entertainment', 'Gaming'],
    'fashion': ['Fashion & Beauty', 'Fashion &amp; Beauty'],
    'beauty-health': ['Erotik'],
    'home-kitchen': ['Haushalt'],
    'sports-outdoor': ['Freizeit', 'Sport'],
    'food-drinks': ['Lebensmittel'],
    'toys-kids': ['Spielzeug'],
    'automotive': ['Werkzeug & Baumarkt', 'Werkzeug &amp; Baumarkt'],
    'office': ['Büro', 'B\u00fcro'],
    'garden': ['Garten'],
    'general': ['Schnäppchen', 'Sonstiges', 'Reisen'],
  }

  return categoryMapping[category.toLowerCase()]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // 获取查询参数
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const merchant = searchParams.get('merchant')

    // 构建查询参数
    const queryParams = new URLSearchParams()

    if (search) {
      queryParams.set('search', search)
    }

    if (merchant) {
      queryParams.set('merchant', merchant)
    }

    // 处理分类映射
    if (category) {
      const backendCategories = mapCategoryToBackend(category)
      if (backendCategories && backendCategories.length > 0) {
        // 后端 API 可能需要多个分类名，这里先用第一个
        queryParams.set('category', backendCategories[0])
      }
    }

    // 调用后端 API - 使用 apiClient（包含认证信息）
    const queryString = queryParams.toString()
    const endpoint = `/api/merchants${queryString ? `?${queryString}` : ''}`

    // 使用apiClient的私有fetch方法需要类型断言
    const apiClientAny = apiClient as any
    const response = await apiClientAny.fetch(endpoint)

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
