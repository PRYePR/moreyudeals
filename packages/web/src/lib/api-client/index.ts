/**
 * API客户端入口
 */

export { ApiClient, apiClient } from './client'
export type {
  ApiDeal,
  ApiDealsResponse,
  ApiDealDetailResponse,
  ApiCategoriesResponse,
  ApiMerchantsResponse,
  ApiStatsResponse,
  GetDealsParams,
  ApiErrorResponse,
} from './types'
export { convertApiDealToDeal, convertApiDealsToDeals } from './converters'
