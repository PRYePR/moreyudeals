/**
 * Fetcher 类型定义
 */

/**
 * 抓取结果
 */
export interface FetchResult {
  /** 从 API 获取的记录数 */
  fetched: number;
  /** 新增到数据库的记录数 */
  inserted: number;
  /** 更新的记录数 */
  updated: number;
  /** 检测到的重复记录数 */
  duplicates: number;
  /** 错误列表 */
  errors: string[];
}
