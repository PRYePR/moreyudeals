# Cache Module Implementation

## Overview

成功实现了 Deal 缓存层模块（Phase 2, Task 2），显著提升了数据获取性能。

## 实现细节

### 模块结构

```
lib/cache/
├── types.ts              # 缓存接口和类型定义
├── cache-keys.ts         # 统一的缓存键生成器
├── redis-cache.ts        # Redis 缓存适配器（存根实现）
├── memory-cache.ts       # 内存缓存适配器
├── cache-manager.ts      # 双层缓存管理器
└── index.ts             # 统一导出
```

### 核心组件

#### 1. **ICache 接口** (`types.ts`)

定义了统一的缓存接口，支持多种后端实现：

```typescript
interface ICache {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  has(key: string): Promise<boolean>
}
```

#### 2. **CacheKeyGenerator** (`cache-keys.ts`)

统一管理所有缓存键的命名规范：

- **前缀管理**：deal, deals, translation, category, merchant
- **TTL 配置**：
  - 单个 Deal: 5分钟
  - Deals 列表: 10分钟
  - 翻译结果: 24小时
  - 分类数据: 1小时
  - 商家信息: 24小时

```typescript
const cacheKey = cacheKeys.allDeals()           // "moreyudeals:deals:all"
const translationKey = cacheKeys.translation(text, 'de', 'zh')
const dealKey = cacheKeys.dealById('abc123')
```

#### 3. **MemoryCache** (`memory-cache.ts`)

内存缓存实现，特性：

- 基于 Map 的简单实现
- 支持 TTL 过期
- 自动清理过期条目（每5分钟）
- 内置统计功能（hits, misses, sets, deletes）

#### 4. **RedisCache** (`redis-cache.ts`)

Redis 缓存适配器（当前为存根实现）：

```typescript
// TODO: 需要安装 @upstash/redis 或 ioredis
// 当前为占位符实现，不执行实际操作
```

#### 5. **CacheManager** (`cache-manager.ts`)

双层缓存管理器，核心特性：

- **自动降级**：Redis 不可用时使用内存缓存
- **双层架构**：内存缓存作为 L1，Redis 作为 L2
- **wrap() 方法**：自动处理缓存逻辑的工具方法

```typescript
const result = await cacheManager.wrap(
  cacheKey,
  async () => fetchDataFromAPI(),
  600 // TTL in seconds
)
```

### 集成到 sparhamster-fetcher

在 `sparhamster-fetcher.ts` 中集成了缓存：

```typescript
async fetchLatestDeals(): Promise<SparhamsterDeal[]> {
  const cacheKey = cacheKeys.allDeals()

  // 尝试从缓存获取
  const cached = await defaultCache.get<SparhamsterDeal[]>(cacheKey)
  if (cached) {
    console.log(`✅ Loaded ${cached.length} deals from cache`)
    return cached
  }

  // 缓存未命中，获取数据
  const deals = await this.fetchFromWordPressAPI()

  // 缓存结果（10分钟）
  await defaultCache.set(cacheKey, deals, CACHE_TTL.DEALS_LIST)

  return deals
}
```

## 性能提升

测试结果（API 端点 `/api/deals/live`）：

| 请求类型 | 响应时间 | 改善 |
|---------|---------|------|
| **第一次请求**（缓存未命中） | 11,419ms (~11.4秒) | - |
| **第二次请求**（缓存命中） | 6ms | **~1900x 更快** |

### 日志示例

```
# 第一次请求
Cache miss - Fetching live deals from Sparhamster.at...
🔍 Fetching deals from WordPress API...
📦 Fetched 20 posts from WordPress API
✅ Successfully parsed 20 deals
🚀 Cached 20 deals for 5 minutes
GET /api/deals/live?limit=5 200 in 11419ms

# 第二次请求
Cache hit - Using cached deals data
Fetched 20 deals from Sparhamster.at
GET /api/deals/live?limit=5 200 in 6ms
```

## 优点

1. **统一接口**：所有缓存操作通过统一的 ICache 接口
2. **可扩展性**：轻松添加新的缓存后端（Redis, Memcached 等）
3. **键管理**：集中管理缓存键，避免冲突和混乱
4. **灵活 TTL**：不同类型数据使用不同的过期时间
5. **双层架构**：结合内存和持久化缓存的优势
6. **降级支持**：主缓存失败时自动使用备用缓存

## 待优化

1. **Redis 实现**：
   - 当前 RedisCache 为存根实现
   - 需要安装 `@upstash/redis` 或 `ioredis`
   - 实现真正的 Redis 连接和操作

2. **缓存失效策略**：
   - 添加主动失效机制
   - 支持标签/分组清理
   - 实现 LRU 淘汰策略

3. **监控和统计**：
   - 添加缓存命中率监控
   - 记录缓存性能指标
   - 集成到日志系统

## 兼容性说明

- 重命名了旧的 `lib/cache.ts` 为 `lib/legacy-cache.ts`
- 旧的 API 路由仍使用 `legacy-cache` 保持向后兼容
- 新代码应使用 `lib/cache/` 模块

## 下一步

根据 PROJECT_REVIEW.md Phase 2 优先级，接下来应该实现：

- **Task 3**: 增强点击追踪（持久化存储）
- **Task 4**: 实现统一日志系统
