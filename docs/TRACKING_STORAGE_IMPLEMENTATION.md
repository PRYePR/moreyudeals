# Tracking Storage Implementation

## Overview

成功实现了点击追踪的持久化存储层（Phase 2, Task 3），支持多种存储后端并提供完整的统计分析功能。

## 实现细节

### 模块结构

```
lib/tracking/
├── types.ts                    # 核心追踪类型定义
├── click-tracker.ts            # 点击追踪服务（重构）
└── storage/
    ├── types.ts                # 存储接口和类型
    ├── memory-storage.ts       # 内存存储实现
    ├── redis-storage.ts        # Redis 存储实现
    └── index.ts               # 统一导出和工厂
```

### 核心组件

#### 1. **ITrackingStorage 接口** (`storage/types.ts`)

统一的存储接口，支持多种后端实现：

```typescript
interface ITrackingStorage {
  // 保存点击事件
  saveClick(event: ClickEvent): Promise<void>

  // 获取统计信息
  getClickStats(dealId: string): Promise<ClickStats | null>

  // 获取所有点击（支持过滤和分页）
  getAllClicks(options?: QueryOptions): Promise<ClickEvent[]>
  getClicks(options: QueryOptions): Promise<PaginatedResult<ClickEvent>>

  // 获取所有统计摘要
  getAllStats(options?: StatsQueryOptions): Promise<ClickStats[]>

  // 数据清理
  cleanupOldClicks(beforeDate: Date): Promise<number>
  clearAll(): Promise<void>
}
```

#### 2. **MemoryTrackingStorage** (`memory-storage.ts`)

内存存储实现，特性：

- 基于数组的简单实现
- 支持灵活的查询和过滤
- 实时计算统计信息
- 适合开发环境和小规模应用

```typescript
// 统计功能
- 总点击数和唯一点击数（基于IP）
- 按日期分组统计
- 按商家分组统计
- 最后点击时间追踪
```

#### 3. **RedisTrackingStorage** (`redis-storage.ts`)

Redis 存储实现（基于 defaultCache），数据结构设计：

```
clicks:all:list              - 所有点击事件列表
clicks:{dealId}:events       - 单个 Deal 的点击事件
clicks:{dealId}:stats        - 单个 Deal 的统计信息（缓存）
clicks:{dealId}:ips          - 单个 Deal 的唯一 IP 集合
```

特性：
- 异步更新统计信息，不阻塞主流程
- 智能缓存统计结果
- 支持自动重新计算
- 适合生产环境

#### 4. **增强的 ClickTracker** (`click-tracker.ts`)

重构后的追踪服务，新增功能：

```typescript
class ClickTracker {
  // 基础功能
  trackClick(event): Promise<void>
  getClickStats(dealId): Promise<{ totalClicks, uniqueIps }>

  // 新增功能
  getDetailedStats(dealId): Promise<ClickStats | null>  // 详细统计
  getAllStats(options): Promise<ClickStats[]>            // 所有 Deals 统计
  cleanupOldData(days): Promise<number>                  // 数据清理
  getAllClicks(options): Promise<ClickEvent[]>           // 灵活查询
}
```

#### 5. **查询和过滤** (`storage/types.ts`)

强大的查询选项：

```typescript
interface QueryOptions {
  limit?: number        // 限制数量
  offset?: number       // 偏移量
  startDate?: Date      // 开始日期
  endDate?: Date        // 结束日期
  orderBy?: 'clickedAt' | 'dealId'
  order?: 'asc' | 'desc'
}

interface StatsQueryOptions {
  limit?: number
  orderBy?: 'totalClicks' | 'uniqueClicks' | 'lastClickedAt'
  order?: 'asc' | 'desc'
  minClicks?: number    // 最小点击数过滤
}
```

### 改进的统计 API

`/api/tracking/stats` 端点功能增强：

```typescript
// 获取所有统计
GET /api/tracking/stats
GET /api/tracking/stats?limit=10&orderBy=totalClicks

// 获取特定 Deal 的详细统计
GET /api/tracking/stats?dealId=xxx
```

响应包含：
- **totalClicks** - 总点击数
- **totalDeals** - 有点击的 Deal 总数
- **stats[]** - 每个 Deal 的详细统计
  - totalClicks
  - uniqueClicks
  - lastClickedAt
  - clicksByDay - 按日期分组
  - topMerchants - 前3个商家
- **recentClicks[]** - 最近10次点击
- **deviceStats** - 设备类型分布

## 配置

### 环境变量

```bash
# 存储类型（可选：memory, redis, postgresql）
TRACKING_STORAGE_TYPE=memory

# Redis URL（当使用 redis 存储时）
UPSTASH_REDIS_REST_URL=your_redis_url
```

### 代码配置

```typescript
import { createTrackingStorage } from '@/lib/tracking/storage'

// 使用默认存储
const tracker = new ClickTracker()  // 使用 defaultTrackingStorage

// 自定义存储
const customStorage = createTrackingStorage({
  type: 'redis',
  redisUrl: process.env.REDIS_URL,
  retentionDays: 90,
  autoCleanup: true
})
const tracker = new ClickTracker(customStorage)
```

## 性能特点

### 内存存储
- ✅ 零延迟读写
- ✅ 简单可靠
- ⚠️ 数据不持久化（重启丢失）
- ⚠️ 内存占用随数据增长

### Redis 存储
- ✅ 数据持久化
- ✅ 高性能（异步写入）
- ✅ 支持大规模数据
- ✅ 统计信息智能缓存
- ⚠️ 需要 Redis 服务

## 数据统计示例

```typescript
// 单个 Deal 统计
{
  "dealId": "abc123",
  "totalClicks": 150,
  "uniqueClicks": 75,
  "lastClickedAt": "2025-10-07T12:00:00Z",
  "clicksByDay": {
    "2025-10-06": 50,
    "2025-10-07": 100
  },
  "clicksByMerchant": {
    "Amazon": 120,
    "MediaMarkt": 30
  }
}
```

## 测试结果

✅ TypeScript 类型检查通过
✅ Dev 服务器正常运行
✅ API 端点正常工作
✅ 内存存储正常初始化
✅ 统计查询功能正常

日志输出：
```
[TrackingStorage] Using memory storage
[CacheManager] Initializing with memory cache
GET /api/tracking/stats 200 in 334ms
```

## 优势

1. **统一接口**：所有存储通过 ITrackingStorage 接口
2. **可扩展**：轻松添加新存储后端（PostgreSQL, MongoDB等）
3. **灵活查询**：支持过滤、排序、分页
4. **详细统计**：按日期、商家、设备等多维度分析
5. **异步优化**：Redis 存储异步更新统计，不阻塞主流程
6. **向后兼容**：保持原有 API 不变，平滑升级

## 待优化

1. **PostgreSQL 实现**：
   - 添加 PostgreSQL 存储适配器
   - 支持更复杂的查询和聚合
   - 实现数据归档机制

2. **自动清理**：
   - 实现定时任务自动清理旧数据
   - 可配置保留策略
   - 数据归档到冷存储

3. **高级分析**：
   - 转化率分析
   - 用户行为分析
   - 热门时段分析
   - A/B 测试支持

4. **性能监控**：
   - 存储性能指标
   - 查询性能分析
   - 自动告警

## 下一步

根据 PROJECT_REVIEW.md Phase 2 优先级，接下来应该实现：

- **Task 4**: 统一日志系统（Winston/Pino）
