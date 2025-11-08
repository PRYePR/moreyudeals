/**
 * API客户端
 * 负责与后端API服务器通信
 */

import type {
  ApiDeal,
  ApiDealsResponse,
  ApiDealDetailResponse,
  ApiCategoriesResponse,
  ApiStatsResponse,
  GetDealsParams,
  ApiErrorResponse,
} from './types'

const DEFAULT_BASE_URL = 'http://localhost:3001'
const DEV_FALLBACK_API_KEY = 'dev_api_key_for_local_testing'

function resolveEnvValue(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]
    if (value) {
      return value
    }
  }
  return undefined
}

export class ApiClient {
  private baseUrl: string
  private apiKey?: string

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl =
      baseUrl ||
      resolveEnvValue('NEXT_PUBLIC_API_URL', 'API_URL', 'API_BASE_URL') ||
      DEFAULT_BASE_URL

    this.apiKey =
      apiKey ||
      resolveEnvValue('NEXT_PUBLIC_API_KEY', 'API_KEY', 'API_SERVER_KEY') ||
      (process.env.NODE_ENV === 'production' ? undefined : DEV_FALLBACK_API_KEY)
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const headers = new Headers(options?.headers || {})
    headers.set('Content-Type', 'application/json')
    if (this.apiKey) {
      headers.set('x-api-key', this.apiKey)
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json().catch(() => ({
          error: 'Unknown error',
          statusCode: response.status,
        }))

        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Network request failed')
    }
  }

  /**
   * 获取优惠列表
   */
  async getDeals(params: GetDealsParams = {}): Promise<ApiDealsResponse> {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })

    const query = searchParams.toString()
    const endpoint = `/api/deals${query ? `?${query}` : ''}`

    return this.fetch<ApiDealsResponse>(endpoint)
  }

  /**
   * 获取优惠详情
   */
  async getDealById(id: string): Promise<ApiDealDetailResponse> {
    // 后端API返回 { data: {...} }，需要转换为 { deal: {...} }
    const response = await this.fetch<{ data: ApiDeal }>(`/api/deals/${id}`)
    return { deal: response.data }
  }

  /**
   * 获取分类列表
   */
  async getCategories(): Promise<ApiCategoriesResponse> {
    return this.fetch<ApiCategoriesResponse>('/api/categories')
  }

  /**
   * 获取商家列表
   */
  async getMerchants(): Promise<import('./types').ApiMerchantsResponse> {
    return this.fetch<import('./types').ApiMerchantsResponse>('/api/merchants')
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<ApiStatsResponse> {
    return this.fetch<ApiStatsResponse>('/api/stats')
  }

  /**
   * 搜索优惠
   */
  async searchDeals(query: string, params: Omit<GetDealsParams, 'search'> = {}): Promise<ApiDealsResponse> {
    return this.getDeals({
      ...params,
      search: query,
    })
  }

  /**
   * 获取交叉筛选数据（分类-商家矩阵）
   */
  async getCrossFilter(): Promise<import('./types').ApiCrossFilterResponse> {
    return this.fetch<import('./types').ApiCrossFilterResponse>('/api/cross-filter')
  }

  /**
   * 健康检查 (不需要API Key)
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; dealCount: number; uptime: number }> {
    const url = `${this.baseUrl}/api/health`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`)
    }

    return response.json()
  }
}

// 创建默认客户端实例
export const apiClient = new ApiClient()
